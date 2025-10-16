const { default: makeWASocket, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { loadSessionFromBase64 } = require('./auth');
const P = require('pino');
const fs = require('fs');

async function startBot() {
    const { state, saveCreds } = await loadSessionFromBase64(); // ✅ use saveCreds instead of saveState

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, fs)
        },
        logger: P({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds); // ✅ correct listener

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            console.log('✅ Bot is connected to WhatsApp!');
        }

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.error('❌ Connection closed. Reason:', reason);

            if (reason === DisconnectReason.loggedOut) {
                console.log('⚠️ Session logged out or invalid. Need to re-pair.');
            } else {
                console.log('🔁 Reconnecting...');
                setTimeout(startBot, 3000);
            }
        }
    });
}

startBot();
