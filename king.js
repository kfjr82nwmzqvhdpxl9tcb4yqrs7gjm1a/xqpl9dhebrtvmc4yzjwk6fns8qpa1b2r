const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');

async function testConnection() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth'); // make sure session dir exists

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'silent' }), // change to 'debug' for more output
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ Connection successfully opened!');
    } else if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.error('❌ Connection closed. Reason:', reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log('⚠️ Session logged out. Delete session folder and re-authenticate.');
      } else {
        console.log('🔁 Reconnecting...');
        testConnection(); // recursively try reconnecting
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

testConnection();
