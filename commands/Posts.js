const { fetchAllPosts } = require('../france/Ig');
const { franceking } = require('../main');

module.exports = {
  name: 'posts',
  aliases: ['igposts', 'instafeed'],
  description: 'Download recent Instagram posts of a given username.',
  category: 'Download',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const username = args[0];

    if (!username) {
      return king.sendMessage(fromJid, {
        text: '📸 *Please provide an Instagram username.*\n\nExample: `!posts natgeo`'
      }, { quoted: msg });
    }

    try {
      const { total, items } = await fetchAllPosts(username);

      if (total === 0 || !items.length) {
        return king.sendMessage(fromJid, {
          text: `❌ *No posts found for @${username}.*\nMaybe the account is private or invalid.`
        }, { quoted: msg });
      }

      // Limit to 5 posts max
      const maxPosts = items.slice(0, 5);

      for (const item of maxPosts) {
        if (item.type === 'image') {
          await king.sendMessage(fromJid, {
            image: { url: item.url },
            caption: `📸 @${username}`
          }, { quoted: msg });
        } else if (item.type === 'video') {
          await king.sendMessage(fromJid, {
            video: { url: item.url },
            caption: `🎥 @${username}`
          }, { quoted: msg });
        }
      }

    } catch (err) {
      console.error('[IG POSTS ERROR]', err);
      await king.sendMessage(fromJid, {
        text: '❌ *Something went wrong fetching posts.* Please try again later.'
      }, { quoted: msg });
    }
  }
};
