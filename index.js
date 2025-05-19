const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Start Flash-MD-V2'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { loadSessionFromBase64 } = require('./auth');
const allCommands = require('./commands');
const { prefix } = require('./config');

const logger = pino({ level: 'fatal' });
const commands = new Map();
const aliases = new Map();

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
    }
});

async function startFlashV2() {
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

    logger.info('🚀 Flash-MD-V2 has started...');

    if (state.creds && state.creds.contacts) {
        const users = Object.keys(state.creds.contacts);
        for (let userId of users) {
            if (userId !== OWNER_JID) {
                await king.sendMessage(userId, {
                    text: `FLASH-MD V2 is connected\nPrefix: ${prefix}\nLoaded commands: ${allCommands.length}`
                });
            }
        }
    } else {
        console.log("No contacts found in the session.");
    }

    king.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || msg.key.fromMe || !msg.message) return;

        const messageType = Object.keys(msg.message)[0];
        let content = '';

        switch (messageType) {
            case 'conversation':
                content = msg.message.conversation;
                break;
            case 'extendedTextMessage':
                content = msg.message.extendedTextMessage.text;
                break;
            case 'imageMessage':
                content = msg.message.imageMessage.caption || '[Image]';
                break;
            case 'videoMessage':
                content = msg.message.videoMessage.caption || '[Video]';
                break;
            case 'audioMessage':
                content = '[Audio]';
                break;
            case 'documentMessage':
                content = msg.message.documentMessage.caption || '[Document]';
                break;
            case 'buttonsMessage':
                content = msg.message.buttonsMessage.contentText || '[Buttons Message]';
                break;
            case 'templateMessage':
                content = '[Template Message]';
                break;
            default:
                content = `[${messageType}]`;
        }

        const sender = msg.pushName || 'Unknown';
        const fromGroup = msg.key.remoteJid.endsWith('@g.us');
        const chatInfo = fromGroup ? `Group: ${msg.key.remoteJid}` : `User: ${sender} (${msg.key.remoteJid})`;

        console.log(`Message Type: ${messageType}`);
        console.log(`Sender: ${chatInfo}`);
        console.log(`Message Content: ${content}`);

        if (!content || !content.startsWith(prefix)) return;

        const args = content.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        try {
            await command.execute(king, msg, args, allCommands);
        } catch (err) {
            console.error('Command failed:', err);
            await king.sendMessage(msg.key.remoteJid, { text: 'Something went wrong.' });
        }
    });

    king.ev.on('creds.update', () => {
        saveState();
    });

    king.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startFlashV2();
        }
    });
}

startFlashV2();
