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
      const sender = msg.key.participant || msg.key.remoteJid;

      if (!query) {
        return await king.sendMessage(fromJid, {
          text: 'Please provide a song name or keyword.'
        }, { quoted: msg });
      }

      try {
        console.log('[PLAY] Searching YT for:', query);
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
          console.log('[PLAY] No results found.');
          return king.sendMessage(fromJid, {
            text: 'No results found for your query.'
          }, { quoted: msg });
        }

        console.log('[PLAY] Found video:', video.title, video.videoId);

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
            `🔗 ${video.url}\n\n` +
            `Reply with:\n1 - Play as Audio\n2 - Send as Document`
        };

        const sentMsg = await king.sendMessage(fromJid, infoMessage, { quoted: msg });
        const sender = msg.key.participant || msg.key.remoteJid;
const chatJid = msg.key.remoteJid;

const userResponse = await king.awaitForMessage({
  sender,
  chatJid,
  timeout: 30000,
  filter: (m) => {
    const text = m?.message?.conversation || m?.message?.extendedTextMessage?.text || '';
    return ['1', '2', '3'].includes(text.trim());
  }
}); 
/*
        const userResponse = await king.awaitForMessage({
          chatJid: fromJid,
          sender,
          timeout: 30000,
          filter: (message) => {
            const txt = message.message?.conversation || message.message?.extendedTextMessage?.text;
            return txt && ['1', '2'].includes(txt.trim());
          }
        });*/

        const replyText = userResponse.message?.conversation || userResponse.message?.extendedTextMessage?.text;
        const choice = replyText.trim();

        console.log('[PLAY] User replied with:', choice);

        // Fixed: Use only videoId in the API link
        const apiURL = `${BASE_URL}/dipto/ytDl3?link=${video.videoId}&format=mp3`;
        console.log('[PLAY] Fetching from API:', apiURL);

        let response;
        try {
          response = await axios.get(apiURL);
          console.log('[PLAY] API response:', response.data);
        } catch (apiErr) {
          console.error('[PLAY] API Error:', apiErr.message);
          return await king.sendMessage(fromJid, {
            text: 'Failed to contact the MP3 server.'
          }, { quoted: msg });
        }

        const data = response.data;

        if (!data.downloadLink) {
          console.log('[PLAY] No downloadLink in response:', data);
          return await king.sendMessage(fromJid, {
            text: 'Failed to retrieve the MP3 download link.'
          }, { quoted: msg });
        }

        const fileName = `${video.title}.mp3`;
        if (choice === '1') {
          console.log('[PLAY] Sending audio file.');
          await king.sendMessage(fromJid, {
            audio: { url: data.downloadLink },
            mimetype: 'audio/mpeg',
            fileName
          }, { quoted: msg });
        } else if (choice === '2') {
          console.log('[PLAY] Sending as document.');
          await king.sendMessage(fromJid, {
            document: { url: data.downloadLink },
            mimetype: 'audio/mpeg',
            fileName
          }, { quoted: msg });
        } else {
          console.log('[PLAY] Invalid user choice:', choice);
          await king.sendMessage(fromJid, {
            text: 'Invalid option. Please reply with "1" or "2".'
          }, { quoted: msg });
        }

      } catch (err) {
        console.error('[PLAY] Play Command Error:', err);
        await king.sendMessage(fromJid, {
          text: 'An error occurred while processing your request.'
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
        const apiURL = `${BASE_URL}/dipto/ytDl3?link=https://youtube.com/watch?v=${videoId}&format=mp4`;

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

        if (!data.downloadLink) {
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

