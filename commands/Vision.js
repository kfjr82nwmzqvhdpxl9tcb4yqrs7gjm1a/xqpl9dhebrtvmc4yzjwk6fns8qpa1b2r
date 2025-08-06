const { franceking } = require('../main');
const Gemini = require('../france/Gemini');

module.exports = [
  {
    name: 'vision',
    get flashOnly() {
      return franceking();
    },
    aliases: ['analyze', 'describe'],
    description: 'Analyze or describe an image using Gemini model.',
    category: 'AI',
    execute: async (king, msg, args, fromJid) => {
      try {
        const quotedMsg = msg.quoted;

        if (!quotedMsg?.message?.imageMessage) {
          return king.sendMessage(fromJid, {
            text: '📷 Please reply to an image with the command.',
          }, { quoted: msg });
        }

        const media = await king.downloadMediaMessage(quotedMsg.message.imageMessage);
        const buffer = Buffer.from(media);

        const ai = new Gemini();

        const prompt = args.join(' ') || 'Describe this image in detail.';
        const result = await ai.chat(prompt, {
          model: 'gemini-1.5-flash',
          file_buffer: buffer
        });

        const responseText = result?.[0]?.content?.parts?.[0]?.text || '⚠️ No description returned.';

        await king.sendMessage(fromJid, {
          text: responseText,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        }, { quoted: quotedMsg });

      } catch (error) {
        console.error('[VISION ERROR]', error);
        await king.sendMessage(fromJid, {
          text: '❌ Failed to analyze the image. Please try again later.',
        }, { quoted: msg });
      }
    }
  }
];
