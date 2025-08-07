const { franceking } = require('../main');
const { downloadFromSSSTwitter } = require('../france/x');

module.exports = {
  name: 'twitter',
  aliases: ['tw', 'twdl'],
  description: 'Download Twitter videos using ssstwitter.com',
  category: 'Downloader',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const url = args[0];

    if (!url || !url.startsWith('https://twitter.com/')) {
      return king.sendMessage(fromJid, {
        text: '🔗 *Please provide a valid Twitter video link.*\n\nExample:\n`!twitter https://twitter.com/username/status/1234567890`'
      }, { quoted: msg });
    }

    try {
      const result = await downloadFromSSSTwitter(url);

      if (!result.mp4high && !result.mp4mid && !result.mp4low) {
        return king.sendMessage(fromJid, {
          text: '⚠️ No downloadable video links found.'
        }, { quoted: msg });
      }

      let replyText = '📥 *Twitter Video Download Links:*\n\n';
      if (result.mp4high) replyText += `🔹 *High Quality:* ${result.mp4high}\n`;
      if (result.mp4mid) replyText += `🔸 *Medium Quality:* ${result.mp4mid}\n`;
      if (result.mp4low) replyText += `▪️ *Low Quality:* ${result.mp4low}\n`;

      await king.sendMessage(fromJid, {
        text: replyText.trim()
      }, { quoted: msg });

    } catch (err) {
      const message = err.message || 'Unknown error';
      const stack = err.stack || '';

      const errorMsg = [
        '*❌ Failed to fetch Twitter video:*',
        `*Message:* ${message}`,
        `*Stack:* ${stack.slice(0, 1000)}`
      ].join('\n\n');

      await king.sendMessage(fromJid, {
        text: errorMsg
      }, { quoted: msg });
    }
  }
};
