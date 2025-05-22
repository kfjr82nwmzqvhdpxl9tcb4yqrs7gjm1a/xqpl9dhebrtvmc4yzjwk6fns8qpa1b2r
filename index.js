const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('WhatsApp Bot is running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const { loadSessionFromBase64 } = require('./auth');
const allCommands = require('./commands');
const conf = require('./config');
const fs = require('fs');
const moment = require('moment-timezone');

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
    }
});

const messageStore = new Map();

async function startBot() {
    const { state, saveState } = await loadSessionFromBase64();
    const { version } = await fetchLatestBaileysVersion();

    const king = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'fatal' }))
        },
        markOnlineOnConnect: true,
        printQRInTerminal: true,
        logger: logger.child({ level: 'fatal' }),
        browser: Browsers.macOS('Safari'),
        version
    });

    king.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg || !msg.message) return;

            const messageId = msg.key.id;
            messageStore.set(messageId, msg);

            const fromJid = msg.key.remoteJid;
            const participant = msg.key?.participant || msg.key.remoteJid;
            const isGroup = fromJid.endsWith('@g.us');
            const isFromMe = msg.key.fromMe;
            const senderJid = isFromMe ? king.user.id : msg.key.participant || msg.key.remoteJid;
            const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];
            let senderName = msg.pushName || senderNumber;
            const Myself = king.user.id;
            let groupMetadata = null;
            let groupAdmins = [];

            if (isGroup) {
                try {
                    groupMetadata = await king.groupMetadata(fromJid);
                    groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                } catch (err) {
                    groupMetadata = { subject: 'Unknown Group', participants: [] };
                    groupAdmins = [];
                }
            }

            const isAdmin = groupAdmins.includes(senderJid);
            const isBotAdmin = groupAdmins.includes(Myself);
            const isBotSelf = senderJid === king.user.id;
            const isDev = conf.owners.includes(senderNumber) || isBotSelf;

            // Check if bot is in private mode and sender is not the bot user or an owner
            if (conf.MODE === 'private' && !conf.owners.includes(senderNumber) && senderNumber !== king.user.id) {
                return;
            }

            const messageType = Object.keys(msg.message)[0];
            const textContent = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                '[Non-text message]';
            console.log(`[LOG] Message from ${senderName} (${senderNumber}) in ${fromJid} | Type: ${messageType} | Text: ${textContent}`);

            if (msg.message?.protocolMessage?.type === 0) {
                const deletedMsgKey = msg.message.protocolMessage.key.id;
                const deletedMsg = messageStore.get(deletedMsgKey);
                const deletedSenderJid = msg.message.protocolMessage.key.participant || msg.key.participant || fromJid;
                senderName = msg.pushName || deletedSenderJid.replace(/@s\.whatsapp\.net$/, '');
                let chatName = '';
                let chatType = 'Private Chat';
                const timezone = 'Africa/Nairobi';
                const date = moment().tz(timezone).format('DD/MM/YYYY');
                const time = moment().tz(timezone).format('hh:mm:ss A');
                let mentions = [deletedSenderJid];

                if (fromJid.endsWith('@g.us')) {
                    try {
                        const metadata = await king.groupMetadata(fromJid);
                        const participant = metadata.participants.find(p => p.id === deletedSenderJid);
                        senderName = participant?.name || participant?.notify || msg.pushName || senderName;
                        chatName = metadata.subject;
                        chatType = 'Group Chat';
                    } catch {
                        chatName = 'Unknown Group';
                    }
                } else if (fromJid === 'status@broadcast') {
                    chatName = 'Status Update';
                    chatType = 'Status';
                    senderName = msg.pushName || senderName;
                    mentions = [];
                } else if (fromJid.endsWith('@newsletter')) {
                    chatName = 'Channel Post';
                    chatType = 'Newsletter';
                    senderName = 'System';
                    mentions = [];
                } else {
                    chatName = senderName;
                }

                if (deletedMsg && deletedSenderJid !== king.user.id) {
                    await king.sendMessage(king.user.id, {
                        text: `*⚡ FLASH-MD ANTI_DELETE ⚡*

*Chat:* ${chatName}
*Type:* ${chatType}
*Deleted By:* ${senderName}
*Number:* +${senderNumber}
*Date:* ${date}
*Time:* ${time}

The following message was deleted:`,
                        mentions
                    });

                    await king.sendMessage(king.user.id, {
                        forward: deletedMsg
                    });
                }
            }

            const m = msg.message;
            const txt = m?.conversation || m?.extendedTextMessage?.text || '';
            const text = txt ||
                m?.imageMessage?.caption ||
                m?.videoMessage?.caption ||
                '';

            let messageTypeStr = '❔ Unknown Type';
            if (txt) messageTypeStr = `💬 Text: "${txt}"`;
            else if (m?.imageMessage) messageTypeStr = '🖼️ Image';
            else if (m?.videoMessage) messageTypeStr = '🎥 Video';
            else if (m?.audioMessage) messageTypeStr = '🎧 Audio';
            else if (m?.stickerMessage) messageTypeStr = '🔖 Sticker';
            else if (m?.documentMessage) messageTypeStr = '📄 Document';
            else if (m?.locationMessage) messageTypeStr = '📍 Location';
            else if (m?.liveLocationMessage) messageTypeStr = '📡 Live Location';
            else if (m?.contactMessage) messageTypeStr = '👤 Contact';
            else if (m?.contactsArrayMessage) messageTypeStr = '👥 Contact List';
            else if (m?.buttonsMessage) messageTypeStr = '🧩 Buttons';
            else if (m?.imageMessage?.viewOnce) messageTypeStr = '⚠️ View Once Image';
            else if (m?.videoMessage?.viewOnce) messageTypeStr = '⚠️ View Once Video';
            else if (m?.viewOnceMessage) messageTypeStr = '⚠️ View Once (Other)';
            else if (m?.templateMessage) messageTypeStr = '🧱 Template';
            else if (m?.listMessage) messageTypeStr = '📋 List';
            else if (m?.pollCreationMessage) messageTypeStr = '📊 Poll';
            else if (m?.pollUpdateMessage) messageTypeStr = '📊 Poll Update';
            else if (m?.reactionMessage) messageTypeStr = '❤️ Reaction';
            else if (m?.protocolMessage) messageTypeStr = '⛔ Deleted Message (protocolMessage)';
            if (m?.reactionMessage) return;

            let chatType = 'Private Chat';
            let groupName = null;

            if (fromJid.endsWith('@g.us')) {
                chatType = 'Group Chat';
                try {
                    const metadata = await king.groupMetadata(fromJid);
                    groupName = metadata.subject;
                } catch {
                    groupName = 'Unknown Group';
                }
            } else if (fromJid === 'status@broadcast') {
                chatType = 'Status';
            } else if (fromJid.endsWith('@newsletter')) {
                chatType = 'Channel';
            }

            const allPrefixes = conf.prefixes;
            const devPrefixes = ['$'];
            const usedPrefix = [...allPrefixes, ...devPrefixes].find(p => text.startsWith(p)) || null;
            if (!usedPrefix) return;

            const args = text.slice(usedPrefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            if (devPrefixes.includes(usedPrefix) && !conf.owners.includes(senderNumber)) {
                return;
            }

            const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
            if (!command) return;

            try {
                await king.sendMessage(fromJid, {
                    react: {
                        text: '🤍',
                        key: msg.key
                    }
                });

                await command.execute(king, msg, args, msg.key.remoteJid, allCommands);
            } catch (err) {
                console.error('Command failed:', err);
                await king.sendMessage(fromJid, { text: 'Something went wrong.' });
            }
        } catch (err) {
            console.error('Error handling message:', err);
        }
    });

    king.ev.on('creds.update', () => {
        saveState();
    });

    king.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }

        if (connection === 'open') {
            const date = moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY');
            const prefixInfo = conf.prefixes.length > 0 ? `Prefixes: [${conf.prefixes.join(', ')}]` : 'Prefixes: [No Prefix]';
            const totalCmds = commands.size;

            const connInfo = `*FLASH-MD-V2 IS CONNECTED ⚡*

*✅ Using Version 2.5!*

*📌 Commands:* ${totalCmds}
*⚙️ ${prefixInfo}*
*🗓️ Date:* ${date}`;

            await king.sendMessage(king.user.id, {
                text: connInfo,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363238139244', // Replace this with your newsletter ID
                    }
                }
            });

            console.log('Bot is connected and running!');
        }
    });
}

startBot().catch(err => console.log('Error starting bot:', err)); 
