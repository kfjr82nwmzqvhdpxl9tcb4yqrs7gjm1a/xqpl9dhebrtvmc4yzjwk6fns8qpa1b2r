const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'silent' }),
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    const msg = messages[0];
    console.log('📥 Msg from:', msg.key.remoteJid);
  });

  sock.ev.on('creds.update', saveCreds);
}
start();
