const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const gis = require('g-i-s');
const yts = require('yt-search');
const fg = require('api-dylux');
const now = require('performance-now');

if (!global.botStartTime) global.botStartTime = Date.now();

module.exports = [
  {
    name: 'attp',
    aliases: ['attp-sticker'],
    description: 'Converts text into an ATTP sticker.',
    category: 'User',
    execute: async (sock, msg, args, jid) => {
      const text = args.join(" ");
      if (!text) {
        return await sock.sendMessage(jid, { text: 'Please provide the text to convert into a sticker!' }, { quoted: msg });
      }

      const apiKey = "with_love_souravkl11";
      const gifUrl = `https://raganork-api.onrender.com/api/attp?text=${encodeURIComponent(text)}&apikey=${apiKey}`;

      try {
        const packname = msg.pushName || 'FLASH-MD';
        const stickerMess = new Sticker(gifUrl, {
          pack: packname,
          author: 'FLASH-MD',
          type: StickerTypes.FULL,
          categories: ['🤩', '🎉'],
          id: '12345',
          quality: 40,
          background: 'transparent',
        });

        const stickerBuffer = await stickerMess.toBuffer();
        await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363238139244263@newsletter', newsletterName: 'FLASH-MD', serverMessageId: -1 } } });
      } catch (error) {
        console.error('Error creating sticker:', error);
        await sock.sendMessage(jid, { text: 'Error while creating that sticker. Please try again.' }, { quoted: msg });
      }
    }
  },
  {
    name: 'stickersearch',
    aliases: ['stsearch', 'stickerfind'],
    description: 'Search and create stickers from Tenor GIFs.',
    category: 'Search',
    execute: async (sock, msg, args, jid) => {
      const search = args.join(' ');
      if (!search) {
        return await sock.sendMessage(jid, { text: 'Insert the type of stickers you want!' }, { quoted: msg });
      }

      const tenorApiKey = 'AIzaSyCyouca1_KKy4W_MG1xsPzuku5oa8W358c';

      try {
        const gifRes = await axios.get(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(search)}&key=${tenorApiKey}&client_key=my_project&limit=5&media_filter=gif`);
        const gifs = gifRes.data.results;

        for (let i = 0; i < gifs.length; i++) {
          const gifUrl = gifs[i].media_formats.gif.url;
          const sticker = new Sticker(gifUrl, {
            pack: msg.pushName || 'FLASH-MD',
            author: 'FLASH-MD',
            type: StickerTypes.FULL,
            quality: 60,
            background: 'transparent',
          });

          const buffer = await sticker.toBuffer();
          await sock.sendMessage(jid, { sticker: buffer }, { quoted: msg, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363238139244263@newsletter', newsletterName: 'FLASH-MD', serverMessageId: -1 } } });
        }
      } catch (error) {
        console.error('stickerSearchCommand error:', error);
        await sock.sendMessage(jid, { text: 'Error searching for stickers.' }, { quoted: msg });
      }
    }
  },
  {
    name: 'weather',
    aliases: ['climate'],
    description: 'Get the current weather for a specific location.',
    category: 'Search',
    execute: async (sock, msg, args, jid) => {
      const location = args.join(' ');
      if (!location) {
        return await sock.sendMessage(jid, { text: 'Give me a location to check the weather.' }, { quoted: msg });
      }

      try {
        const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
          params: {
            q: location,
            units: 'metric',
            appid: '060a6bcfa19809c2cd4d97a212b19273',
            language: 'en'
          }
        });

        const data = res.data;

        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();
        const rainVolume = data.rain ? data.rain['1h'] : 0;

        const text = `❄️ *Weather in ${data.name}, ${data.sys.country}*

🌡️ *Temperature:* ${data.main.temp}°C (Feels like ${data.main.feels_like}°C)
📉 *Min:* ${data.main.temp_min}°C  📈 *Max:* ${data.main.temp_max}°C
📝 *Condition:* ${data.weather[0].description}
💧 *Humidity:* ${data.main.humidity}%
🌬️ *Wind:* ${data.wind.speed} m/s
☁️ *Cloudiness:* ${data.clouds.all}%
🌧️ *Rain (last hour):* ${rainVolume} mm
🌄 *Sunrise:* ${sunrise}
🌅 *Sunset:* ${sunset}
🧭 *Coordinates:* ${data.coord.lat}, ${data.coord.lon}

*°Powered by FLASH-MD*`;

        await sock.sendMessage(jid, { text }, { quoted: msg, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363238139244263@newsletter', newsletterName: 'FLASH-MD', serverMessageId: -1 } } });
      } catch (error) {
        console.error('weatherCommand error:', error);
        await sock.sendMessage(jid, { text: 'Failed to fetch weather data. Try again later.' }, { quoted: msg });
      }
    }
  },
  {
    name: 'yts',
    aliases: ['ytsearch'],
    description: 'Searches YouTube videos by keyword.',
    category: 'Search',
    execute: async (sock, msg, args, jid) => {
      const query = args.join(' ');
      if (!query) {
        return await sock.sendMessage(jid, { text: 'What do you want to search for?' }, { quoted: msg });
      }

      try {
        const info = await yts(query);
        const result = info.videos.slice(0, 10);

        let text = `*YouTube Search Results for:* _${query}_\n\n`;
        for (let i = 0; i < result.length; i++) {
          text += `*${i + 1}. ${result[i].title}*\n`;
          text += `📺 Channel: ${result[i].author.name}\n`;
          text += `⏱ Duration: ${result[i].timestamp}\n`;
          text += `🔗 Link: ${result[i].url}\n\n`;
        }

        text += '*Powered by FLASH-MD*';

        await sock.sendMessage(jid, {
          image: { url: result[0].thumbnail },
          caption: text
        }, { quoted: msg, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363238139244263@newsletter', newsletterName: 'FLASH-MD', serverMessageId: -1 } } });

      } catch (error) {
        await sock.sendMessage(jid, { text: 'Error occurred while searching YouTube.' }, { quoted: msg });
        console.error('ytsCommand error:', error);
      }
    }
  },
  {
    name: 'ytmp4',
    aliases: [],
    description: 'Downloads a YouTube video.',
    category: 'Download',
    execute: async (sock, msg, args, jid) => {
      const url = args[0];
      if (!url) {
        return await sock.sendMessage(jid, { text: 'Insert a YouTube link.' }, { quoted: msg });
      }

      try {
        const result = await fg.yta(url);
        const videoUrl = result.dl_url;
        const title = result.title;

        if (videoUrl) {
          await sock.sendMessage(jid, {
            video: { url: videoUrl },
            caption: `*🎬 Title:* ${title}\n*🔗 Source:* ${url}\n\n_Powered by FLASH-MD_`
          }, { quoted: msg, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363238139244263@newsletter', newsletterName: 'FLASH-MD', serverMessageId: -1 } } });
        } else {
          await sock.sendMessage(jid, { text: 'Failed to get video download link.' }, { quoted: msg });
        }
      } catch (error) {
        await sock.sendMessage(jid, { text: 'Error downloading video.' }, { quoted: msg });
        console.error('ytmp4Command error:', error);
      }
    }
  },
  {
    name: 'ytmp3',
    aliases: [],
    description: 'Downloads audio from a YouTube video.',
    category: 'Download',
    execute: async (sock, msg, args, jid) => {
      const url = args[0];
      if (!url) {
        return await sock.sendMessage(jid, { text: 'Insert a YouTube link.' }, { quoted: msg });
      }

      try {
        const result = await fg.yta(url);
        const audioUrl = result.dl_url;
        const title = result.title;

        if (audioUrl) {
          await sock.sendMessage(jid, {
            audio: { url: audioUrl },
            mimetype: 'audio/mp4',
            fileName: title,
            ptt: false
          }, { quoted: msg, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363238139244263@newsletter', newsletterName: 'FLASH-MD', serverMessageId: -1 } } });
        } else {
          await sock.sendMessage(jid, { text: 'Failed to get audio download link.' }, { quoted: msg });
        }
      } catch (error) {
        await sock.sendMessage(jid, { text: 'Error downloading audio.' }, { quoted: msg });
        console.error('ytmp3Command error:', error);
      }
    }
  }
];
