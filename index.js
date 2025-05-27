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
const pino = require('pino');
const moment = require('moment-timezone');
const { loadSessionFromBase64 } = require('./auth');
const allCommands = require('./commands');
const conf = require('./config');
require('./flash.js');

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();
const messageStore = new Map();
const DEV_NUMBERS = conf.owners;

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases) cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
});

function isGroupJid(jid) {
    return jid.endsWith('@g.us') || jid.endsWith('@lid');
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
        printQRInTerminal: true,
        logger,
        browser: Browsers.macOS('Safari'),
        version
    });

    // --- ANTIDELETE ---
    king.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;
        messageStore.set(msg.key.id, msg);
    });

    king.ev.on('messages.update', async updates => {
        for (const update of updates) {
            if (update.messageStubType === 0 && update.update.message === null) {
                const deletedMsgKey = update.key.id;
                const deletedMsg = messageStore.get(deletedMsgKey);
                const fromJid = update.key.remoteJid;
                const deletedSenderJid = update.key.participant || update.key.remoteJid;
                const senderNumber = deletedSenderJid.replace(/@.*$/, '').split(':')[0];
                const senderName = deletedMsg?.pushName || senderNumber;
                const chatName = isGroupJid(fromJid) ? 'Group Chat' : 'Private Chat';

                const date = moment().tz('Africa/Nairobi').format('DD/MM/YYYY');
                const time = moment().tz('Africa/Nairobi').format('hh:mm:ss A');

                if (deletedMsg && deletedSenderJid !== king.user.id) {
                    await king.sendMessage(king.user.id, {
                        text: `*⚡ FLASH-MD ANTI_DELETE ⚡*

*Chat:* ${chatName}
*Deleted By:* ${senderName}
*Number:* +${senderNumber}
*Date:* ${date}
*Time:* ${time}

The following message was deleted:`,
                        mentions: [deletedSenderJid]
                    });

                    await king.sendMessage(king.user.id, { forward: deletedMsg });
                }
            }
        }
    });

    // --- MESSAGE LOGGING & COMMAND HANDLER ---
    king.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const fromJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;
        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';
        const text = txt || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
        if (!text) return;

        const senderJid = isFromMe ? king.user.id : msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];
        const isGroup = isGroupJid(fromJid);

        let messageType = '❔ Unknown';
        if (txt) messageType = `💬 Text: "${txt}"`;
        else if (m?.imageMessage) messageType = '🖼️ Image';
        else if (m?.videoMessage) messageType = '🎥 Video';
        else if (m?.audioMessage) messageType = '🎧 Audio';
        else if (m?.stickerMessage) messageType = '🔖 Sticker';
        else if (m?.documentMessage) messageType = '📄 Document';

        const chatType = isGroup ? 'Group Chat' : 'Private Chat';
        let groupName = '';
        if (isGroup) {
            try {
                const metadata = await king.groupMetadata(fromJid);
                groupName = metadata.subject;
            } catch {
                groupName = 'Unknown Group';
            }
        }

        console.log(`\n===== ${chatType.toUpperCase()} =====\nMessage: ${messageType}\nSender: ${msg.pushName || senderNumber} (${senderNumber})${groupName ? `\nGroup: ${groupName}` : ''}\n`);

        const prefixes = [...conf.prefixes, '$'];
        const usedPrefix = prefixes.find(p => text.startsWith(p)) ?? '';
        if (!isFromMe && usedPrefix === '') return;

        const args = text.slice(usedPrefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        const isDev = DEV_NUMBERS.includes(senderNumber) || senderJid === king.user.id;
        if (usedPrefix === '$' && !isDev) return;

        let groupAdmins = [];
        if (isGroup) {
            try {
                const metadata = await king.groupMetadata(fromJid);
                groupAdmins = metadata.participants
                    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                    .map(p => p.id);
            } catch {}
        }

        const isAdmin = groupAdmins.includes(senderJid);
        const isBotAdmin = groupAdmins.includes(king.user.id);

        if (command.groupOnly && !isGroup)
            return king.sendMessage(fromJid, { text: '❌ This command only works in groups.' }, { quoted: msg });

        if (command.adminOnly && !isAdmin && !isDev)
            return king.sendMessage(fromJid, { text: '⛔ This command is restricted to group admins.' }, { quoted: msg });

        if (command.botAdminOnly && !isBotAdmin)
            return king.sendMessage(fromJid, { text: '⚠️ I need to be an admin to do that.' }, { quoted: msg });

        try {
            await command.execute(king, msg, args, fromJid, allCommands);
        } catch (err) {
            console.error('Command error:', err);
            king.sendMessage(fromJid, { text: 'Something went wrong.' }).catch(() => {});
        }
    });

    king.ev.on('creds.update', saveState);

    king.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
            try {
                king.ev.removeAllListeners();
                king.ws.close();
            } catch {}
            startBot();
        }
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
                    newsletterJid: '120363238139244263@newsletter',
                    newsletterName: 'FLASH-MD',
                    serverMessageId: -1
                }
            }
        }).catch(() => {});

        console.log(`Bot connected as ${king.user.id}`);
    }
});
