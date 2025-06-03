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
const db = require('./db');  // DB import

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();
const messageStore = new Map();

const PRESENCE = {
    DM: conf.PRESENCE_DM || 'available',
    GROUP: conf.PRESENCE_GROUP || 'available'
};

const DEV_NUMBERS = new Set(['254742063632', '254757835036']);

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases) cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
});

function isGroupJid(jid) {
    return jid.endsWith('@g.us') || jid.endsWith('@lid');
}

function normalizeJid(jid) {
    return jid.split('@')[0].split(':')[0];
}

function getChatCategory(jid) {
    if (jid === 'status@broadcast') return '🟡 Status Update';
    if (jid.endsWith('@newsletter')) return '📢 Channel Post';
    if (jid.endsWith('@s.whatsapp.net')) return '💬 Private Chat';
    if (jid.endsWith('@g.us') || jid.endsWith('@lid')) return '👥 Group Chat';
    return '❔ Unknown Chat Type';
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
            const superUsers = [
                '254742063632@s.whatsapp.net',
                '254757835036@s.whatsapp.net',
                '254751284190@s.whatsapp.net'
            ];
            if (!superUsers.includes(callerId)) {
                try {
                    await king.sendCallResult(callId, { type: 'reject' });
                } catch (err) {
                    console.error('Failed to reject call:', err);
                }
            }
        }
    });

    king.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                try {
                    king.ev.removeAllListeners();
                    king.ws.close();
                } catch (err) {
                    console.error('Error while closing WebSocket:', err);
                }
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
        }
    });

    king.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const fromJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;
        const isDM = fromJid.endsWith('@s.whatsapp.net');
        const senderJid = isFromMe ? king.user.id : (msg.key.participant || msg.key.remoteJid);
        const senderNumber = normalizeJid(senderJid);
        const isDev = DEV_NUMBERS.has(senderNumber);
        const isSelf = senderNumber === normalizeJid(king.user.id);
        const m = msg.message;

        const chatType = getChatCategory(fromJid);
        const pushName = msg.pushName || 'Unknown';

        messageStore.set(msg.key.id, msg);

        let contentSummary = '';
        if (m?.conversation) contentSummary = m.conversation;
        else if (m?.extendedTextMessage?.text) contentSummary = m.extendedTextMessage.text;
        else if (m?.imageMessage) contentSummary = `📷 Image${m.imageMessage.caption ? ` | Caption: ${m.imageMessage.caption}` : ''}`;
        else if (m?.videoMessage) contentSummary = `🎥 Video${m.videoMessage.caption ? ` | Caption: ${m.videoMessage.caption}` : ''}`;
        else if (m?.audioMessage) contentSummary = `🎵 Audio`;
        else if (m?.stickerMessage) contentSummary = `🖼️ Sticker`;
        else if (m?.documentMessage) contentSummary = `📄 Document`;
        else if (m?.contactMessage) contentSummary = `👤 Contact: ${m.contactMessage.displayName || 'Unknown'}`;
        else if (m?.pollCreationMessage) contentSummary = `📊 Poll: ${m.pollCreationMessage.name}`;
        else if (m?.reactionMessage) contentSummary = `❤️ Reaction: ${m.reactionMessage.text}`;
        else contentSummary = '[📦 Unknown or Unsupported Message Type]';

        console.log(`\n=== ${chatType.toUpperCase()} ===`);
        console.log(`Chat name: ${chatType === '💬 Private Chat' ? 'Private Chat' : 'Group Chat'}`);
        console.log(`Message sender: ${pushName} (+${senderNumber})`);
        console.log(`Message: ${contentSummary}\n`);

        if (conf.AUTO_READ_MESSAGES && isDM && !isFromMe) {
            king.readMessages([msg.key]).catch(() => {});
        }

        if (fromJid === 'status@broadcast' && conf.AUTO_VIEW_STATUS) {
            king.readMessages([msg.key]).catch(() => {});
            if (conf.AUTO_LIKE === "on" && msg.key.participant) {
                await king.sendMessage(fromJid, {
                    react: { key: msg.key, text: '🤍' }
                }, {
                    statusJidList: [msg.key.participant, king.user.id]
                });
            }
        }

        // Extract text from message
        const text = m?.conversation || m?.extendedTextMessage?.text || m?.imageMessage?.caption || m?.videoMessage?.caption || '';
        if (!text) return;

        // ----- ANTI-LINK HANDLING -----
        if (isGroupJid(fromJid)) {
            try {
                const settings = await db.getGroupSettings(fromJid);
                if (settings?.antilink_enabled) {
                    // Regex to detect links
                    const linkRegex = /(https?:\/\/|www\.)[^\s]+/i;
                    if (linkRegex.test(text)) {
                        const action = settings.action || 'warn';

                        if (senderNumber === normalizeJid(king.user.id)) {
                            // Ignore messages from the bot itself
                        } else {
                            switch (action) {
                                case 'warn': {
                                    await db.incrementWarning(fromJid, senderJid);
                                    const warnings = await db.getWarnings(fromJid, senderJid);
                                    await king.sendMessage(fromJid, {
                                        text: `⚠️ @${senderNumber}, posting links is not allowed!\nYou have been warned (${warnings} warning${warnings > 1 ? 's' : ''}).`
                                    }, {
                                        quoted: msg,
                                        mentions: [senderJid]
                                    });
                                    break;
                                }
                                case 'kick': {
                                    try {
                                        await king.groupParticipantsUpdate(fromJid, [senderJid], 'remove');
                                        await king.sendMessage(fromJid, {
                                            text: `🚫 @${senderNumber} has been removed for posting a link.`
                                        }, {
                                            mentions: [senderJid]
                                        });
                                    } catch (e) {
                                        console.error('Failed to kick user:', e);
                                    }
                                    break;
                                }
                                case 'delete': {
                                    try {
                                        await king.sendMessage(fromJid, { delete: msg.key });
                                    } catch (e) {
                                        console.error('Failed to delete message:', e);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error in anti-link handling:', e);
            }
        }

        // ----- COMMAND HANDLING -----
        const prefixes = [...conf.prefixes];
        const usedPrefix = prefixes.find(p => text.toLowerCase().startsWith(p));
        if (!usedPrefix) return;

        const cmdText = text.slice(usedPrefix.length).trim();
        const args = cmdText.split(/\s+/);
        const cmdName = args.shift()?.toLowerCase();
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        const botMode = (conf.MODE || 'public').toLowerCase();
        if (botMode === 'private' && !isDev) {
            console.log(`❌ Blocked command from non-dev: +${senderNumber}`);
            return;
        }

        await king.sendMessage(fromJid, {
            react: { key: msg.key, text: '🤍' }
        }).catch(() => {});

        try {
            await command.execute(king, msg, args, fromJid, allCommands);
        } catch (err) {
            console.error('Command error:', err);
            king.sendMessage(fromJid, {
                text: '⚠️ Something went wrong while executing the command.'
            }).catch(() => {});
        }
    });

    king.ev.on('creds.update', saveState);
}

startBot();
