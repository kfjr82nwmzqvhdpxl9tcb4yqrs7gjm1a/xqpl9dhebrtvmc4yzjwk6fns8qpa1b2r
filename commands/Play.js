const axios = require('axios');
const yts = require('yt-search');

const BASE_URL = 'https://noobs-api.top';

module.exports = [
  {
    name: 'play',
    aliases: ['music', 'ytmp3', 'song'],
    description: 'Search and download MP3 music from YouTube.',
    category: 'Search',
    execute: async (king, msg, args, fromJid) => {
      const query = args.join(' ');
      if (!query) {
        return await king.sendMessage(fromJid, {
          text: 'Please provide a song name or keyword.',
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
      }

      try {
        const search = await yts(query);
        const video = search.videos[0];
        const videoId = video.videoId;
        const apiURL = `${BASE_URL}/dipto/ytDl3?link=${videoId}&format=mp3`;

        const infoMessage = {
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
            `🔗 https://youtube.com/watch?v=${videoId}\n\n` +
            `_Powered by FLASH-MD_`,
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

        await king.sendMessage(fromJid, infoMessage, { quoted: msg });

        const response = await axios.get(apiURL);
        const data = response.data;

        if (data.success !== 'true' || !data.downloadLink) {
          return await king.sendMessage(fromJid, {
            text: 'Failed to retrieve the MP3 download link.',
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
        }

        await king.sendMessage(fromJid, {
          audio: { url: data.downloadLink },
          mimetype: 'audio/mpeg',
          fileName: `${video.title}.mp3`,
          ptt: false,
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

      } catch (err) {
        console.error(err);
        await king.sendMessage(fromJid, {
          text: 'An error occurred while fetching the music.',
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
      }
    }
  },

  {
    name: 'video',
    aliases: ['ytmp4'],
    description: 'Search and download MP4 video from YouTube.',
    category: 'Search',
    execute: async (king, msg, args, fromJid) => {
      const query = args.join(' ');
      if (!query) {
        return await king.sendMessage(fromJid, {
          text: 'Please provide a video name or keyword.',
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
      }

      try {
        const search = await yts(query);
        const video = search.videos[0];
        const videoId = video.videoId;
        const apiURL = `${BASE_URL}/dipto/ytDl3?link=${videoId}&format=mp4`;

        const infoMessage = {
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
            `🔗 https://youtube.com/watch?v=${videoId}\n\n` +
            `_Powered by FLASH-MD_`,
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

        await king.sendMessage(fromJid, infoMessage, { quoted: msg });

        const response = await axios.get(apiURL);
        const data = response.data;

        if (data.success !== 'true' || !data.downloadLink) {
          return await king.sendMessage(fromJid, {
            text: 'Failed to retrieve the MP4 download link.',
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
        }

        await king.sendMessage(fromJid, {
          video: { url: data.downloadLink },
          mimetype: 'video/mp4',
          caption: `🎬 *${video.title}*\n\n_Powered by FLASH-MD_`,
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

      } catch (err) {
        console.error(err);
        await king.sendMessage(fromJid, {
          text: 'An error occurred while fetching the video.',
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
      }
    }
  }
];
