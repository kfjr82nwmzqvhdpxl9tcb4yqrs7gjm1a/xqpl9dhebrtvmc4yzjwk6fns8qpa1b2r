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

      if (error || !igmp4) {
        return king.sendMessage(fromJid, {
          text: `❌ *Failed to download media:*\n${error || 'Invalid or unsupported link.'}`
        }, { quoted: msg });
      }

      const isVideo = igmp4.includes('.mp4') || igmp4.includes('video');

      if (isVideo) {
        await king.sendMessage(fromJid, {
          video: { url: igmp4 },
          caption: '_*✨ Downloaded by Flash-Md-V2*_'
        }, { quoted: msg });
      } else {
        await king.sendMessage(fromJid, {
          image: { url: igmp4 },
          caption: '_*✨ Downloaded by Flash-Md-V2*_'
        }, { quoted: msg });
      }

    } catch (err) {
      await king.sendMessage(fromJid, {
        text: '❌ *Unexpected error occurred. Please try again later.*'
      }, { quoted: msg });
    }
  }
};
