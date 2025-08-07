const { fetchStories } = require('../france/Ig');

module.exports = {
  name: 'instastories',
  aliases: ['igstories', 'stories'],
  description: 'Fetch Instagram stories using Mollygram.',
  category: 'Scraper',

  async execute(king, msg, args, fromJid) {
    const username = args[0];
    if (!username) {
      return king.sendMessage(fromJid, {
        text: '📖 *Provide a username to fetch stories.*\n\nExample: `.instastories kimkardashian`'
      }, { quoted: msg });
    }

    const res = await fetchStories(username);
    if (res.total === 0) {
      return king.sendMessage(fromJid, {
        text: `⚠️ No stories found for *${username}*.`
      }, { quoted: msg });
    }

    const results = res.items.slice(0, 5).map((item, i) =>
      `*${i + 1}. [${item.type.toUpperCase()}]*\n${item.url}`
    ).join('\n\n');

    await king.sendMessage(fromJid, {
      text: `📖 *Stories from ${username}:*\n\n${results}`
    }, { quoted: msg });
  }
};
