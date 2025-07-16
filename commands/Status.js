const axios = require('axios');
const fs = require('fs');
const { franceking } = require('../main');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'status',
  description: 'Send a story/status update to selected users.',
  category: 'Broadcast',
  get flashOnly() {
    return franceking();
  },
  execute: async (king, msg, args, extras = {}) => {
    const fromJid = msg.key.remoteJid;

    // Mock list: Replace with dynamic user fetch or config
    const statusJidList = [
      '1234567890@c.us',
      '1122334455@c.us'
    ];

    const caption = args.join(' ') || '✨ FLASH-MD Status Update!';

    let mediaBuffer;
    let mediaType = 'image';
    let mediaPayload;

    try {
      if (msg.message?.imageMessage || msg.message?.videoMessage) {
        // If replying to a media message
        mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}, { reuploadRequest: king.updateMediaMessage });
        mediaType = msg.message.imageMessage ? 'image' : 'video';
      } else if (args[0]?.startsWith('http')) {
        // If a URL is given as argument
        const response = await axios.get(args[0], { responseType: 'arraybuffer' });
        mediaBuffer = Buffer.from(response.data, 'binary');
      } else {
        return king.sendMessage(fromJid, {
          text: 'Please reply to an image/video message or provide a valid image/video URL.'
        }, { quoted: msg });
      }

      mediaPayload = {
        [mediaType]: mediaBuffer,
        caption
      };

      await king.sendMessage(
        fromJid,
        { text: `✅ Sending status to ${statusJidList.length} contacts...` },
        { quoted: msg }
      );

      await king.sendMessage(
        fromJid,
        mediaPayload,
        {
          broadcast: true,
          statusJidList,
          backgroundColor: '#075e54', // WhatsApp green (optional)
          font: 1 // 1=default, 2=handwriting, 3=typewriter etc.
        }
      );

    } catch (err) {
      console.error('[STATUS ERROR]', err);
      await king.sendMessage(fromJid, {
        text: '❌ Failed to send status update. Please try again.'
      }, { quoted: msg });
    }
  }
};
