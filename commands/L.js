// commands/genius.js
const { searchGenius, getLyrics } = require('../france/genius');
const { franceking } = require('../main');

module.exports = {
  name: 'genius',
  aliases: ['lyrics', 'song'],
  description: 'Search and get lyrics from Genius.',
  category: 'Music',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const query = args.join(' ').trim();

    if (!query) {
      return king.sendMessage(fromJid, {
        text: '🎶 *Please enter a song name to search.*\n\nExample: /genius blinding lights'
      }, { quoted: msg });
    }

    try {
      const url = await searchGenius(query);
      const { title, lyrics } = await getLyrics(url);

      const resultText = `🎤 *${title}*\n\n${lyrics}`;

      const message = resultText.length > 4000
        ? resultText.slice(0, 4000) + '…'
        : resultText;

      await king.sendMessage(fromJid, {
        text: message
      }, { quoted: msg });

    } catch (err) {
      const errorMessage = [
        '*❌ Could not get lyrics.*',
        err.message ? `*Reason:* ${err.message}` : ''
      ].filter(Boolean).join('\n\n');

      await king.sendMessage(fromJid, {
        text: errorMessage
      }, { quoted: msg });
    }
  }
};
