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

const PRESENCE = {
    DM: conf.PRESENCE_DM || 'available',
    GROUP: conf.PRESENCE_GROUP || 'available'
};

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

    king.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        messageStore.set(msg.key.id, msg);

        const fromJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;
        const isDM = fromJid.endsWith('@s.whatsapp.net');
        const isStatus = fromJid === 'status@broadcast';
        const isGroup = isGroupJid(fromJid);

        if (PRESENCE[isGroup ? 'GROUP' : 'DM']) {
            king.sendPresenceUpdate(PRESENCE[isGroup ? 'GROUP' : 'DM'], fromJid).catch(() => {});
        }

        if (conf.AUTO_READ_MESSAGES && isDM && !isFromMe) {
            king.readMessages([msg.key]).catch(() => {});
        }

        if (isStatus && conf.AUTO_VIEW_STATUS) {
            king.readMessages([msg.key]).catch(() => {});
            if (conf.AUTO_LIKE === "on" && msg.key.participant) {
                await king.sendMessage(fromJid, {
                    react: { key: msg.key, text: '🤍' }
                }, {
                    statusJidList: [msg.key.participant, king.user.id]
                });
            }
        }

        const m = msg.message;
        const txt = m?.conversation || m?.extendedTextMessage?.text || '';
        const text = txt || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
        if (!text) return;

        const prefixes = [...conf.prefixes];
        const prefixlessAllowed = prefixes.length === 0;

        const startsWithValidPrefix = prefixes.find(p => text.startsWith(p));
        const hasAnyPrefix = /^[^\s\w]/.test(text);

        if (!prefixlessAllowed) {
            if (!startsWithValidPrefix) return;
        } else {
            if (hasAnyPrefix) return;
        }

        const usedPrefix = startsWithValidPrefix || '';
        const args = text.slice(usedPrefix.length).trim().split(/ +/);
        const cmdName = args.shift()?.toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        let groupAdmins = [];
        if (isGroup) {
            try {
                const metadata = await king.groupMetadata(fromJid);
                groupAdmins = metadata.participants
                    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                    .map(p => p.id);
            } catch {}
        }

        const senderJid = isFromMe ? king.user.id : msg.key.participant || msg.key.remoteJid;
        const isAdmin = groupAdmins.includes(senderJid);
        const isBotAdmin = groupAdmins.includes(king.user.id);

        if (command.groupOnly && !isGroup)
            return king.sendMessage(fromJid, { text: '❌ This command only works in groups.' }, { quoted: msg });

        if (command.adminOnly && !isAdmin)
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
            global.KING_ID = king.user.id;
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
}

startBot();
