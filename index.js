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
allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases) cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
});

const messageStore = new Set();
const DEV_NUMBERS = conf.owners;

const PRESENCE = {
    DM: conf.PRESENCE_DM || 'available',
    GROUP: conf.PRESENCE_GROUP || 'available'
};

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

    king.ev.on('call', async (call) => {
        if (conf.ANTICALL === "on") {
            const callId = call[0].id;
            const callerId = call[0].from;
            const superUsers = ['254742063632@s.whatsapp.net', '254757835036@s.whatsapp.net'];
            if (!superUsers.includes(callerId)) {
                try {
                    await king.sendCallResult(callId, { type: 'reject' });
                    console.log(`Call from ${callerId} declined.`);
                } catch (e) {
                    console.error('Call reject failed:', e);
                }
            }
        }
    });

    king.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message || messageStore.has(msg.key.id)) return;
        messageStore.add(msg.key.id);

        const fromJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;
        const isDM = fromJid.endsWith('@s.whatsapp.net');
        const isStatus = fromJid === 'status@broadcast';

        // Fast read
        if (conf.AUTO_READ_MESSAGES && isDM && !isFromMe) {
            king.readMessages([msg.key]).catch(() => {});
        }

        if (isStatus && conf.AUTO_VIEW_STATUS) {
            king.readMessages([msg.key]).catch(() => {});
        }

        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';
        const text = txt || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
        if (!text) return;

        const prefixes = [...conf.prefixes, '$'];
        const usedPrefix = prefixes.find(p => text.startsWith(p)) ?? '';
        if (!isFromMe && usedPrefix === '') return;

        const args = text.slice(usedPrefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        const isGroup = isGroupJid(fromJid);
        const senderJid = isFromMe ? king.user.id : msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];
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

        if (PRESENCE[isGroup ? 'GROUP' : 'DM']) {
            king.sendPresenceUpdate(PRESENCE[isGroup ? 'GROUP' : 'DM'], fromJid).catch(() => {});
        }

        try {
            await command.execute(king, msg, args, fromJid, allCommands);
            if (PRESENCE[isGroup ? 'GROUP' : 'DM'] !== 'paused') {
                king.sendPresenceUpdate('paused', fromJid).catch(() => {});
            }
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

            await king.sendMessage(king.user.id, { text: connInfo }).catch(() => {});
            console.log(`Bot connected as ${king.user.id}`);
        }
    });
}

startBot();
