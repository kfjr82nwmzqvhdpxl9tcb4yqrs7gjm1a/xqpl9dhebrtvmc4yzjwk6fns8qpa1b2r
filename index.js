const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { loadSessionFromBase64, getEncodedSession } = require('./auth');
const allCommands = require('./commands');
const { prefix } = require('./config');
const fs = require('fs');

const commands = new Map();
const aliases = new Map();

allCommands.forEach(cmd => {
    commands.set(cmd.name, cmd);
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliases.set(alias, cmd.name));
    }
});

async function startBot() {
    const { state, saveState } = await loadSessionFromBase64();
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0']
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || msg.key.fromMe || !msg.message) return;

        const text = msg.message.conversation || msg.message?.extendedTextMessage?.text;
        if (!text || !text.startsWith(prefix)) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
        if (!command) return;

        try {
            await command.execute(sock, msg, args, allCommands);
        } catch (err) {
            console.error('Command failed:', err);
            await sock.sendMessage(msg.key.remoteJid, { text: 'Something went wrong.' });
        }
    });

    sock.ev.on('creds.update', () => {
        saveState();
        const base64 = getEncodedSession();
        console.log('Updated session (Base64):\n', base64);
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });
}

startBot();
