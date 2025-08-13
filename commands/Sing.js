const ytdl = require('../france/Yt');
const yts = require('yt-search');

module.exports = {
  name: 'sing',
  aliases: ['yt', 'song'],
  description: 'Play and download YouTube audio from link or search query.',
  category: 'Media',

  execute: async (king, msg, args, fromJid) => {
    if (!args.length) {
      return king.sendMessage(fromJid, {
        text: '🎵 *Provide a YouTube link or search query.*\nExample: `.play Shape of You`'
      }, { quoted: msg });
    }

    let query = args.join(' ');
    let url = '';

    // If input is a valid YT link
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      url = query;
    } else {
      // Otherwise, search YouTube
      const result = await yts(query);
      if (!result.videos.length) {
        return king.sendMessage(fromJid, {
          text: '❌ No results found for your query.'
        }, { quoted: msg });
      }
      const video = result.videos[0];
      url = video.url;
    }

    const { mp3 } = await ytdl(url);

    if (!mp3) {
      return king.sendMessage(fromJid, {
        text: '⚠️ Failed to download audio. Try another link or query.'
      }, { quoted: msg });
    }

    await king.sendMessage(fromJid, {
      audio: { url: mp3 },
      mimetype: 'audio/mpeg',
    }, { quoted: msg });
  }
};
