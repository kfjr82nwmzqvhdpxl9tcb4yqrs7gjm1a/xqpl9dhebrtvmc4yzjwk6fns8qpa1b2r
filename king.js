const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { loadSessionFromBase64 } = require('./auth');
const P = require('pino');

async function startBot() {
    const { state, saveState } = await loadSessionFromBase64();

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveState);

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
                setTimeout(startBot, 3000); // small delay before retry
            }
        }
    });
}

startBot();
