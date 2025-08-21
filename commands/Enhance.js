const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { enhanceImage } = require('../france/scraper');
const { franceking } = require('../main');

module.exports = {
  name: 'enhance',
  description: 'Enhance the quality of a replied image using a free online AI.',
  category: 'AI',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted?.imageMessage) {
      return king.sendMessage(fromJid, {
        text: '🖼️ *Reply to an image to enhance it.*'
      }, { quoted: msg });
    }

    try {
      const imageBuffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        'buffer', {}, { logger: console }
      );

      const enhancedBuffer = await enhanceImage(imageBuffer);

      await king.sendMessage(fromJid, {
        image: { buffer: enhancedBuffer },
        caption: '🔧 Image enhanced with free online AI.'
      }, { quoted: msg });

    } catch (err) {
      let errorMessage = '❌ Failed to enhance the image.';

      if (err.response && err.response.data) {
        errorMessage += `\n*API Response:* ${JSON.stringify(err.response.data).slice(0, 1000)}`;
      } else if (err.message) {
        errorMessage += `\n*Error:* ${err.message}`;
      }

      await king.sendMessage(fromJid, { text: errorMessage }, { quoted: msg });
      console.error('Enhance error:', err);
    }
  }
};

