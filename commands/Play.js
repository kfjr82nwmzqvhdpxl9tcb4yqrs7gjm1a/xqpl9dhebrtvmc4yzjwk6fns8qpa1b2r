const { franceking } = require('../main');
const ytdownload = require('../france/Yt');
const yts = require('yt-search');

module.exports = [
  {
    name: 'play1',
    get flashOnly() {
      return franceking();
    },
    description: 'Search and play MP3 music from YouTube (audio only).',
    category: 'Search',
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      const query = args.join(' ');
      if (!query) return king.sendMessage(fromJid, { text: 'Please provide a song name or keyword.' }, { quoted: msg });

      try {
        const { videos } = await yts(query);
        const video = videos?.[0];
        if (!video) return king.sendMessage(fromJid, { text: 'No results found for your query.' }, { quoted: msg });

        const { mp3 } = await ytdownload(video.url);
        if (!mp3) return king.sendMessage(fromJid, { text: 'Failed to retrieve the MP3.' }, { quoted: msg });

        await king.sendMessage(fromJid, {
          image: { url: video.thumbnail },
          caption:
            `*FLASH-MD SONG PLAYER*\n\n` +
            `╭───────────────◆\n` +
            `│⿻ *Title:* ${video.title}\n` +
            `│⿻ *Duration:* ${video.timestamp}\n` +
            `│⿻ *Views:* ${video.views.toLocaleString()}\n` +
            `│⿻ *Uploaded:* ${video.ago}\n` +
            `│⿻ *Channel:* ${video.author.name}\n` +
            `╰────────────────◆\n\n` +
            `🔗 ${video.url}`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });

        await king.sendMessage(fromJid, {
          audio: { url: mp3 },
          mimetype: 'audio/mpeg',
          fileName: `${video.title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
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
        console.error('[PLAY] Error:', err);
        await king.sendMessage(fromJid, { text: 'An error occurred while processing your request.' }, { quoted: msg });
      }
    }
  },

  {
    name: 'song1',
    get flashOnly() {
      return franceking();
    },
    description: 'Search and send MP3 music as document from YouTube.',
    category: 'Search',
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      const query = args.join(' ');
      if (!query) return king.sendMessage(fromJid, { text: 'Please provide a song name or keyword.' }, { quoted: msg });

      try {
        const { videos } = await yts(query);
        const video = videos?.[0];
        if (!video) return king.sendMessage(fromJid, { text: 'No results found for your query.' }, { quoted: msg });

        const { mp3 } = await ytdownload(video.url);
        if (!mp3) return king.sendMessage(fromJid, { text: 'Failed to retrieve the MP3.' }, { quoted: msg });

        await king.sendMessage(fromJid, {
          image: { url: video.thumbnail },
          caption:
            `*FLASH-MD SONG PLAYER*\n\n` +
            `╭───────────────◆\n` +
            `│⿻ *Title:* ${video.title}\n` +
            `│⿻ *Duration:* ${video.timestamp}\n` +
            `│⿻ *Views:* ${video.views.toLocaleString()}\n` +
            `│⿻ *Uploaded:* ${video.ago}\n` +
            `│⿻ *Channel:* ${video.author.name}\n` +
            `╰────────────────◆\n\n` +
            `🔗 ${video.url}`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });

        await king.sendMessage(fromJid, {
          document: { url: mp3 },
          mimetype: 'audio/mpeg',
          fileName: `${video.title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
          caption: '*FLASH-MD V2*'
        }, { quoted: msg });

      } catch (err) {
        console.error('[SONG] Error:', err);
        await king.sendMessage(fromJid, { text: 'An error occurred while processing your request.' }, { quoted: msg });
      }
    }
  },

  {
    name: 'video1',
    get flashOnly() {
      return franceking();
    },
    description: 'Search and send video from YouTube as MP4.',
    category: 'Search',
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      const query = args.join(' ');
      if (!query) return king.sendMessage(fromJid, { text: 'Please provide a video name or keyword.' }, { quoted: msg });

      try {
        const { videos } = await yts(query);
        const video = videos?.[0];
        if (!video) return king.sendMessage(fromJid, { text: 'No results found for your query.' }, { quoted: msg });

        const { mp4 } = await ytdownload(video.url);
        if (!mp4) return king.sendMessage(fromJid, { text: 'Failed to retrieve the MP4.' }, { quoted: msg });

        await king.sendMessage(fromJid, {
          image: { url: video.thumbnail },
          caption:
            `*FLASH-MD VIDEO PLAYER*\n\n` +
            `╭───────────────◆\n` +
            `│⿻ *Title:* ${video.title}\n` +
            `│⿻ *Duration:* ${video.timestamp}\n` +
            `│⿻ *Views:* ${video.views.toLocaleString()}\n` +
            `│⿻ *Uploaded:* ${video.ago}\n` +
            `│⿻ *Channel:* ${video.author.name}\n` +
            `╰────────────────◆\n\n` +
            `🔗 ${video.url}`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });

        await king.sendMessage(fromJid, {
          video: { url: mp4 },
          mimetype: 'video/mp4',
          fileName: `${video.title.replace(/[\\/:*?"<>|]/g, '')}.mp4`,
          caption: '*FLASH-MD V2*'
        }, { quoted: msg });

      } catch (err) {
        console.error('[VIDEO] Error:', err);
        await king.sendMessage(fromJid, { text: 'An error occurred while processing your request.' }, { quoted: msg });
      }
    }
  }
];
