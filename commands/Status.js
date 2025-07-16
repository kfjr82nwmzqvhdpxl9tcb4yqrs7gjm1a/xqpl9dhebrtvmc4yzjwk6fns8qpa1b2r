const axios = require('axios');
const { franceking } = require('../main');
const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'status',
  aliases: ['mystatus', 'stat'],
  description: 'Show your current WhatsApp status updates',
  flashOnly: false,
  groupOnly: false,
  ownerOnly: false,

  execute: async (king, msg, args, fromJid) => {
    const sender = msg.key.participant || msg.key.remoteJid;

    try {
      // Make sure the status message is coming from status@broadcast
      if (msg.key.remoteJid !== 'status@broadcast') {
        return await king.sendMessage(fromJid, {
          text: '❌ This command is only for viewing your own status updates.'
        }, { quoted: msg });
      }

      const status = msg.message?.statusMessage;

      if (!status || !Array.isArray(status.all)) {
        return await king.sendMessage(fromJid, {
          text: '⚠️ Could not read any status update information.'
        }, { quoted: msg });
      }

      const allStatuses = status.all;
      const formatted = allStatuses.map((s, i) => {
        return `📍 *${i + 1}.* ${s.text || 'No text'} (${s.timestamp || 'unknown'})`;
      }).join('\n\n');

      await king.sendMessage(fromJid, {
        text: `*🟢 Your Status Updates:*\n\n${formatted}`
      }, { quoted: msg });

    } catch (err) {
      console.error('❗ Error in status command:', err);
      await king.sendMessage(fromJid, {
        text: '❌ Failed to fetch status information. It may not be available or supported.'
      }, { quoted: msg });
    }
  }
};
