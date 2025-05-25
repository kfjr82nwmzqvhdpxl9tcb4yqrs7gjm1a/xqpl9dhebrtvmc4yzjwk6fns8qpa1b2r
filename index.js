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
require('./flash.js');
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
const DEV_NUMBERS = ['254742063632', '254757835036'];

function normalizeJid(jid) {
    return jid?.split('@')[0]?.split(':')[0] || jid;
}

async function startBot() {
    const { state, saveState } = await loadSessionFromBase64();
    const { version } = await fetchLatestBaileysVersion();

    const king = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'fatal' }))
        },
        markOnlineOnConnect: true,
        logger: logger.child({ level: 'fatal' }),
        browser: Browsers.macOS('Safari'),
        version
    });

    king.ev.on('messages.upsert', async ({ messages }) => {
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
        const botJid = king.user.id + '@s.whatsapp.net';
        let groupMetadata = null;
        let groupAdmins = [];

        if (isGroup) {
            try {
                groupMetadata = await king.groupMetadata(fromJid);
                groupAdmins = groupMetadata.participants
                    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                    .map(p => p.id);
            } catch (err) {
                groupMetadata = { subject: 'Unknown Group', participants: [] };
                groupAdmins = [];
            }
        }

        const isAdmin = groupAdmins.some(admin => normalizeJid(admin) === normalizeJid(senderJid));
        const isBotAdmin = groupAdmins.some(admin => normalizeJid(admin) === normalizeJid(botJid));
        const isBotSelf = normalizeJid(senderJid) === normalizeJid(botJid);
        const isDev = DEV_NUMBERS.includes(senderNumber) || isBotSelf;

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

        let messageType = '❔ Unknown Type';
        if (txt) messageType = `💬 Text: "${txt}"`;
        else if (m?.imageMessage) messageType = '🖼️ Image';
        else if (m?.videoMessage) messageType = '🎥 Video';
        else if (m?.audioMessage) messageType = '🎧 Audio';
        else if (m?.stickerMessage) messageType = '🔖 Sticker';
        else if (m?.documentMessage) messageType = '📄 Document';
        else if (m?.locationMessage) messageType = '📍 Location';
        else if (m?.liveLocationMessage) messageType = '📡 Live Location';
        else if (m?.contactMessage) messageType = '👤 Contact';
        else if (m?.contactsArrayMessage) messageType = '👥 Contact List';
        else if (m?.buttonsMessage) messageType = '🧩 Buttons';
        else if (m?.imageMessage?.viewOnce) messageType = '⚠️ View Once Image';
        else if (m?.videoMessage?.viewOnce) messageType = '⚠️ View Once Video';
        else if (m?.viewOnceMessage) messageType = '⚠️ View Once (Other)';
        else if (m?.templateMessage) messageType = '🧱 Template';
        else if (m?.listMessage) messageType = '📋 List';
        else if (m?.pollCreationMessage) messageType = '📊 Poll';
        else if (m?.pollUpdateMessage) messageType = '📊 Poll Update';
        else if (m?.reactionMessage) messageType = '❤️ Reaction';
        else if (m?.protocolMessage) messageType = '⛔ Deleted Message (protocolMessage)';
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

        let logBase = `
Message: ${messageType}
Sender: ${senderName} (${senderNumber})`;

        if (chatType === 'Group Chat' && groupName) {
            logBase += `
Group: ${groupName}`;
        }

        console.log(`\n===== ${chatType.toUpperCase()} MESSAGE =====${logBase}\n`);

        const userPrefixes = conf.prefixes;
        const devPrefixes = ['$'];
        const allPrefixes = userPrefixes.length > 0 ? [...userPrefixes, ...devPrefixes] : devPrefixes;

        const usedPrefix = allPrefixes.find(p => text.startsWith(p)) || null;

        if (!usedPrefix) {
            if (userPrefixes.length === 0) {
                const commandText = text.trim().split(/ +/)[0].toLowerCase();
                const command = commands.get(commandText) || commands.get(aliases.get(commandText));
                if (!command) return;
                if (command.groupOnly && !isGroup) {
                    return king.sendMessage(fromJid, {
                        text: '❌ This command only works in groups.'
                    }, { quoted: msg });
                }
                if (command.adminOnly && !isAdmin && !isDev) {
                    return king.sendMessage(fromJid, {
                        text: '⛔ This command is restricted to group admins.'
                    }, { quoted: msg });
                }
                if (command.botAdminOnly && !isBotAdmin) {
                    return king.sendMessage(fromJid, {
                        text: '⚠️ I need to be an admin to do that.'
                    }, { quoted: msg });
                }
                try {
                    await king.sendMessage(fromJid, {
                        react: {
                            text: '🤍',
                            key: msg.key
                        }
                    });
                    await command.execute(king, msg, [], fromJid, allCommands);
                } catch (err) {
                    await king.sendMessage(fromJid, { text: 'Something went wrong.' });
                }
                return;
            }
            return;
        }

        if (usedPrefix === '$' && !isDev) return;

        const body = text.slice(usedPrefix.length).trim();
        const args = body.split(/ +/);
        const commandText = args.shift().toLowerCase();
        const command = commands.get(commandText) || commands.get(aliases.get(commandText));
        if (!command) return;

        if (command.groupOnly && !isGroup) {
            return king.sendMessage(fromJid, {
                text: '❌ This command only works in groups.'
            }, { quoted: msg });
        }

        if (command.adminOnly && !isAdmin && !isDev) {
            return king.sendMessage(fromJid, {
                text: '⛔ This command is restricted to group admins.'
            }, { quoted: msg });
        }

        if (command.botAdminOnly && !isBotAdmin) {
            return king.sendMessage(fromJid, {
                text: '⚠️ I need to be an admin to do that.'
            }, { quoted: msg });
        }

        try {
            await king.sendMessage(fromJid, {
                react: {
                    text: '🤍',
                    key: msg.key
                }
            });
            await command.execute(king, msg, args, fromJid, allCommands);
        } catch (err) {
            await king.sendMessage(fromJid, { text: 'Something went wrong.' });
        }
    });

    king.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Scan this QR code to connect:', qr);
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('Logged out. Please reauthenticate.');
                process.exit(0);
            }
            console.log('Connection closed. Reconnecting...');
            startBot();
        }
        if (connection === 'open') {
            console.log(`Bot connected as ${king.user.id}`);
            king.sendMessage(king.user.id, {
                text: `*FLASH-MD-V2 IS CONNECTED ⚡*\n\n*✅ Using Version 2.5!*\n\n*📌 Commands:* ${commands.size}\n*⚙️ Prefixes:* ${conf.prefixes.length === 0 ? '[]' : JSON.stringify(conf.prefixes)}\n*🗓️ Date:* ${moment().tz('Africa/Nairobi').format('dddd, Do MMMM YYYY')}`
            });
        }
    });

    king.ev.on('creds.update', saveState);
}

startBot();
