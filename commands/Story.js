const { fetchStories } = require('../france/Ig');

module.exports = {
  name: 'instastories',
  aliases: ['igstories', 'stories'],
  description: 'Fetch Instagram stories using Mollygram.',
  category: 'Download',

  async execute(king, msg, args, fromJid) {
    const username = args[0]?.toLowerCase(); // lowercase username
    if (!username) {
      return king.sendMessage(fromJid, {
        text: '📖 *Provide a username to fetch stories.*\n\nExample: `.instastories kimkardashian`'
      }, { quoted: msg });
    }

    try {
      const res = await fetchStories(username);

      if (!res || res.total === 0 || !Array.isArray(res.items)) {
        return king.sendMessage(fromJid, {
          text: `⚠️ No stories found for *${username}*.`
        }, { quoted: msg });
      }

      const stories = res.items.slice(0, 5); // Limit to first 5

      for (const [index, item] of stories.entries()) {
        const caption = `📖 *${username}* - Story ${index + 1} of ${stories.length}\n\n_*✨Downloaded by Flash-Md-V2*_`;

        if (item.type === 'image') {
          await king.sendMessage(fromJid, {
            image: { url: item.url },
            caption
          }, { quoted: msg });
        } else if (item.type === 'video') {
          await king.sendMessage(fromJid, {
            video: { url: item.url },
            caption
          }, { quoted: msg });
        } else {
          await king.sendMessage(fromJid, {
            text: `⚠️ Unknown media type:\n${item.url}`
          }, { quoted: msg });
        }
      }

    } catch (error) {
      console.error('Error fetching Instagram stories:', error);
      return king.sendMessage(fromJid, {
        text: `❌ Failed to fetch stories for *${username}*. Try again later.`
      }, { quoted: msg });
    }
  }
};
