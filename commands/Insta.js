const getInstaMedia = require('../france/Insta');
const { franceking } = require('../main');

module.exports = {
  name: 'insta',
  aliases: ['igdl', 'reel'],
  description: 'Download media from an Instagram link.',
  category: 'Instagram',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const url = args[0];

    if (!url || !url.startsWith('http') || !url.includes('instagram.com')) {
      return king.sendMessage(fromJid, {
        text: '🔗 *Please provide a valid Instagram URL.*\n\nExample: `!insta https://www.instagram.com/reel/xyz123/`'
      }, { quoted: msg });
    }

    try {
      const { igmp4, error } = await getInstaMedia(url);

      if (error) {
        return king.sendMessage(fromJid, {
          text: `❌ *Failed to download media:*\n${error}`
        }, { quoted: msg });
      }

      await king.sendMessage(fromJid, {
        video: { url: igmp4 },
        caption: '📥 *Downloaded from Instagram*'
      }, { quoted: msg });

    } catch (err) {
      await king.sendMessage(fromJid, {
        text: '❌ *Unexpected error occurred. Please try again later.*'
      }, { quoted: msg });
    }
  }
};
