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

        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';
        const text = txt ||
                     m?.imageMessage?.caption ||
                     m?.videoMessage?.caption ||
                     '';

        if (m?.reactionMessage) return;

        let usedPrefix = null;
        if (text.startsWith('$') && isDev) {
            usedPrefix = '$';
        } else {
            usedPrefix = conf.prefixes.find(p => p && text.startsWith(p)) ?? (conf.prefixes.includes('') ? '' : null);
        }

        if (usedPrefix === null) return;

        const args = text.slice(usedPrefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

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
            const totalCmds = commands.size;

            const connInfo = `*FLASH-MD-V2 IS CONNECTED ⚡*

*✅ Using Version 2.5!*

*📌 Commands:* ${totalCmds}
*⚙️ Prefixes:* ${conf.prefixes.map(p => `"${p}"`).join(', ')}
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
            });

            console.log('Bot connected and styled welcome message sent.');
        }
    });
}

startBot();
