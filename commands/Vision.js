const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const vertexAI = require('../france/Gemini');
const { franceking } = require('../main');

module.exports = {
  name: 'vision',
  aliases: ['analyze', 'describe'],
  description: 'Analyze and describe an image using Gemini AI.',
  category: 'AI',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, jid) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || !quoted.imageMessage) {
      return await king.sendMessage(jid, {
        text: '🖼️ *Please reply to an image to analyze.*'
      }, { quoted: msg });
    }

    try {
      const imageBuffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        'buffer',
        {},
        { logger: console }
      );

      const prompt = args.length > 0 ? args.join(' ') : 'Describe the image in detail.';
      const ai = new vertexAI();

      const result = await ai.chat(prompt, {
        model: 'gemini-1.5-flash',
        file_buffer: imageBuffer
      });

      const description = result?.[0]?.content?.parts?.[0]?.text;

      if (!description) {
        return await king.sendMessage(jid, {
          text: '⚠️ No response received from Gemini AI.'
        }, { quoted: msg });
      }

      await king.sendMessage(jid, {
        text: `🧠 *Image Analysis Result:*\n\n${description}`
      }, { quoted: msg });

    } catch (err) {
      console.error('[VISION ERROR]', err.response?.data || err.message || err);
      await king.sendMessage(jid, {
        text: '❌ Failed to analyze the image. Please try again later.'
      }, { quoted: msg });
    }
  }
};
