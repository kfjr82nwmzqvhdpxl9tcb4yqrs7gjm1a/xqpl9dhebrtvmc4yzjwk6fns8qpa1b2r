const axios = require('axios');

module.exports = [
  {
    name: 'best-wallp',
    aliases: ['bestwal', 'best', 'bw'],
    description: 'Sends a high-quality random wallpaper.',
    category: 'FLASH PICS',
    execute: async (sock, msg) => {
      const chatId = msg.key.remoteJid;
      try {
        const { data } = await axios.get('https://api.unsplash.com/photos/random?client_id=72utkjatCBC-PDcx7-Kcvgod7-QOFAm2fXwEeW8b8cc');
        const url = data?.urls?.regular;
        if (!url) {
          return await sock.sendMessage(chatId, { text: "Couldn't fetch wallpaper. Try again later." });
        }
        await sock.sendMessage(chatId, {
          image: { url },
          caption: "*POWERED BY FLASH-MD*",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        });
      } catch (error) {
        console.error('Wallpaper Error:', error);
        await sock.sendMessage(chatId, { text: "An error occurred while fetching wallpaper." });
      }
    }
  },

  {
    name: 'random',
    aliases: [],
    description: 'Sends a random wallpaper from Unsplash.',
    category: 'FLASH PICS',
    execute: async (sock, msg) => {
      const chatId = msg.key.remoteJid;
      try {
        const { data } = await axios.get('https://api.unsplash.com/photos/random?client_id=72utkjatCBC-PDcx7-Kcvgod7-QOFAm2fXwEeW8b8cc');
        const url = data?.urls?.regular;
        if (!url) {
          return await sock.sendMessage(chatId, { text: "Couldn't fetch wallpaper. Try again later." });
        }
        await sock.sendMessage(chatId, {
          image: { url },
          caption: "*POWERED BY FLASH-MD*",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        });
      } catch (error) {
        console.error('Random Wallpaper Error:', error);
        await sock.sendMessage(chatId, { text: "An error occurred while fetching wallpaper." });
      }
    }
  },

  {
    name: 'nature',
    aliases: [],
    description: 'Sends a random nature-themed wallpaper.',
    category: 'FLASH PICS',
    execute: async (sock, msg) => {
      const chatId = msg.key.remoteJid;
      try {
        const { data } = await axios.get('https://api.unsplash.com/photos/random?client_id=72utkjatCBC-PDcx7-Kcvgod7-QOFAm2fXwEeW8b8cc&query=nature');
        const url = data?.urls?.regular;
        if (!url) {
          return await sock.sendMessage(chatId, { text: "Couldn't fetch nature wallpaper. Try again later." });
        }
        await sock.sendMessage(chatId, {
          image: { url },
          caption: "*POWERED BY FLASH-MD*",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        });
      } catch (error) {
        console.error('Nature Wallpaper Error:', error);
        await sock.sendMessage(chatId, { text: "An error occurred while fetching nature wallpaper." });
      }
    }
  },

  {
    name: 'time',
    aliases: ['timezone', 'clock'],
    description: 'Get the current time and timezone for a specific country.',
    category: 'General',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      if (!args || args.length === 0) {
        return await sock.sendMessage(chatId, { text: "Enter the name of the country you want to know the time and date of." });
      }
      const query = args.join(' ');
      const url = `https://levanter.onrender.com/time?code=${encodeURIComponent(query)}`;
      try {
        const { data } = await axios.get(url);
        if (!data?.result?.length) {
          return await sock.sendMessage(chatId, { text: "That country name is incorrect!" });
        }
        const { name, time, timeZone } = data.result[0];
        await sock.sendMessage(chatId, {
          text: `Live Time in ${name}:\n\n*Date & Time:* ${time}\n*TimeZone:* ${timeZone}`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: 'FLASH-MD',
              serverMessageId: -1
            }
          }
        });
      
