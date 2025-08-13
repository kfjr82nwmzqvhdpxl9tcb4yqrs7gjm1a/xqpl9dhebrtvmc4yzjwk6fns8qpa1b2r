const ytdl = require('../france/Yt');
const yts = require('yt-search');
const axios = require('axios');

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

    // Check if query is a YouTube link
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      url = query;
    } else {
      // Search YouTube
      const result = await yts(query);
      if (!result.videos.length) {
        return king.sendMessage(fromJid, {
          text: '❌ No results found for your query.'
        }, { quoted: msg });
      }
      url = result.videos[0].url;
    }

    let mp3Url;
    try {
      const { mp3 } = await ytdl(url);
      mp3Url = mp3;
    } catch (err) {
      return king.sendMessage(fromJid, {
        text: '⚠️ Failed to fetch audio URL. Try another link or query.'
      }, { quoted: msg });
    }

    if (!mp3Url) {
      return king.sendMessage(fromJid, {
        text: '⚠️ No audio found for that link.'
      }, { quoted: msg });
    }

    // Download the mp3 file as buffer
    let audioBuffer;
    try {
      const response = await axios.get(mp3Url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      audioBuffer = Buffer.from(response.data);
    } catch (error) {
      return king.sendMessage(fromJid, {
        text: '⚠️ Failed to download the audio file.'
      }, { quoted: msg });
    }

    // Optionally, you could add validation or re-encoding here as your friend did

    // Send audio as a file buffer
    try {
      await king.sendMessage(fromJid, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${query}.mp3`,
      }, { quoted: msg });
    } catch (err) {
      return king.sendMessage(fromJid, {
        text: '⚠️ Failed to send audio file.'
      }, { quoted: msg });
    }
  }
};
