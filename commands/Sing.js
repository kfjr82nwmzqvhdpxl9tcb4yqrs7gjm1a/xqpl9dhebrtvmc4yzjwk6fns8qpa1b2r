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
        text: '🎵 *Provide a YouTube link or search query.*\nExample: `.sing Shape of You`'
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

    try {
      const { mp3, videoInfo } = await ytdl(url);

      if (!mp3) {
        return king.sendMessage(fromJid, {
          text: '⚠️ Failed to download audio. Try another link or query.'
        }, { quoted: msg });
      }

      // Construct metadata message similar to the play command
      const message = {
        image: { url: videoInfo.thumbnail },
        caption: 
          `*FLASH-MD SONG PLAYER*\n\n` +
          `╭───────────────◆\n` +
          `│⿻ *Title:* ${videoInfo.title}\n` +
          `│⿻ *Duration:* ${videoInfo.duration}\n` +
          `│⿻ *Views:* ${videoInfo.views.toLocaleString()}\n` +
          `│⿻ *Uploaded:* ${videoInfo.ago}\n` +
          `│⿻ *Channel:* ${videoInfo.author.name}\n` +
          `╰────────────────◆\n\n` +
          `🔗 ${videoInfo.url}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        }
      };

      // Send the metadata message with thumbnail
      await king.sendMessage(fromJid, message, { quoted: msg });

      // Send the MP3 as an audio message
      await king.sendMessage(fromJid, {
        audio: { url: mp3 },
        mimetype: 'audio/mpeg',
        fileName: 'yt-audio.mp3',
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        },
        caption: 'FLASH-MD V2'
      }, { quoted: msg });

    } catch (err) {
      console.error('[ERROR] Audio extraction failed:', err);
      return king.sendMessage(fromJid, {
        text: '⚠️ Failed to download audio. Try another link or query.'
      }, { quoted: msg });
    }
  }
};
