const axios = require('axios');
const { franceking } = require('../main');

module.exports = {
  name: 'tiny',
  aliases: ['shorten', 'shorturl'],
  description: 'Shorten a long URL using TinyURL service.',
  category: 'Utilities',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const longUrl = args[0];

    if (!longUrl || !longUrl.startsWith('http')) {
      return king.sendMessage(fromJid, {
        text: '🔗 *Usage:* `.tinyurl <long-url>`\n\nExample: `.tinyurl https://example.com/very/long/link`'
      }, { quoted: msg });
    }

    try {
      const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
      const shortUrl = response.data;

      await king.sendMessage(fromJid, {
        text: `✅ *Shortened URL:*\n${shortUrl}`
      }, { quoted: msg });

    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const message = err.message;
      const stack = err.stack;

      const errorMsg = [
        '*❌ Error while shortening URL:*',
        status ? `*Status:* ${status}` : '',
        message ? `*Message:* ${message}` : '',
        data ? `*Data:* ${JSON.stringify(data, null, 2)}` : '',
        stack ? `*Stack:* ${stack}` : ''
      ].filter(Boolean).join('\n\n');

      const trimmed = errorMsg.length > 4000 ? errorMsg.slice(0, 4000) + '…' : errorMsg;

      await king.sendMessage(fromJid, {
        text: trimmed
      }, { quoted: msg });
    }
  }
};
