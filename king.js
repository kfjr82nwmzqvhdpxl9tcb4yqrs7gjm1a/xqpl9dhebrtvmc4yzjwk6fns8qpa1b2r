const { default: makeWASocket } = require('@whiskeysockets/baileys');
const P = require('pino');
const moment = require('moment-timezone');

// 🔄 Use your base64 loader instead
const { loadSessionFromBase64 } = require('./auth');

async function start() {
  const { state, saveState } = await loadSessionFromBase64();

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: state.keys
    },
    printQRInTerminal: true,
    logger: P({ level: 'info' }), // use 'info' for debugging
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    const msg = messages[0];
    if (!msg) return;

    const jid = msg.key.remoteJid;
    const fromGroup = jid.endsWith('@g.us');
    const sender = msg.key.participant || msg.key.remoteJid;
    const timestamp = moment.unix(msg.messageTimestamp).format('HH:mm:ss');

    console.log(`📥 [${timestamp}] Message from ${fromGroup ? 'GROUP' : 'DM'}: ${jid} - Sender: ${sender}`);
  });

  sock.ev.on('creds.update', saveState);
}

start();
