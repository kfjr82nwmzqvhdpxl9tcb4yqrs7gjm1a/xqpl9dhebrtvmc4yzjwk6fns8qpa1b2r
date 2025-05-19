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
        const response = await fetch('https://api.unsplash.com/photos/random?client_id=72utkjatCBC-PDcx7-Kcvgod7-QOFAm2fXwEeW8b8cc');
        const data = await response.json();
        const url = data[0]?.urls?.regular;
        if (!url) {
          return await sock.sendMessage(chatId, { text: "Couldn't fetch wallpaper. Try again later." });
        }
        await sock.sendMessage(chatId, { 
          image: { url }, 
          caption: "*POWERED BY FLASH-MD*",
          contextInfo: {
            externalAdReply: {
              title: 'Flash-MD',
              body: 'Powered by France King',
              mediaType: 1,
              thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
              sourceUrl: 'https://github.com/franceking1/Flash-Md',
              showAdAttribution: true,
              previewType: 0,
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: "Flash-MD Wallpapers",
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
        const response = await fetch('https://api.unsplash.com/photos/random?client_id=72utkjatCBC-PDcx7-Kcvgod7-QOFAm2fXwEeW8b8cc');
        const data = await response.json();
        const url = data[0]?.urls?.regular;
        if (!url) {
          return await sock.sendMessage(chatId, { text: "Couldn't fetch wallpaper. Try again later." });
        }
        await sock.sendMessage(chatId, { 
          image: { url }, 
          caption: "*POWERED BY FLASH-MD*",
          contextInfo: {
            externalAdReply: {
              title: 'Flash-MD',
              body: 'Powered by France King',
              mediaType: 1,
              thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
              sourceUrl: 'https://github.com/franceking1/Flash-Md',
              showAdAttribution: true,
              previewType: 0,
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: "Flash-MD Wallpapers",
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
        const response = await fetch('https://api.unsplash.com/photos/random?client_id=72utkjatCBC-PDcx7-Kcvgod7-QOFAm2fXwEeW8b8cc&query=nature');
        const data = await response.json();
        const url = data[0]?.urls?.regular;
        if (!url) {
          return await sock.sendMessage(chatId, { text: "Couldn't fetch nature wallpaper. Try again later." });
        }
        await sock.sendMessage(chatId, { 
          image: { url }, 
          caption: "*POWERED BY FLASH-MD*",
          contextInfo: {
            externalAdReply: {
              title: 'Flash-MD',
              body: 'Powered by France King',
              mediaType: 1,
              thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
              sourceUrl: 'https://github.com/franceking1/Flash-Md',
              showAdAttribution: true,
              previewType: 0,
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: "Nature Wallpapers",
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
        const responseText = `Live Time in ${name}:\n\n*Date & Time:* ${time}\n*TimeZone:* ${timeZone}`;
        await sock.sendMessage(chatId, {
          text: responseText,
          contextInfo: {
            externalAdReply: {
              title: 'Flash-MD',
              body: 'Powered by France King',
              mediaType: 1,
              thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
              sourceUrl: 'https://github.com/franceking1/Flash-Md',
              showAdAttribution: true,
              previewType: 0,
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: "World Time Info",
            }
          }
        });
      } catch (error) {
        console.error('Time API Error:', error);
        await sock.sendMessage(chatId, { text: "An error occurred or the country name is invalid." });
      }
    }
  },
  {
    name: 'llama',
    aliases: ['ilama'],
    description: 'Ask LLaMA AI a question or prompt.',
    category: 'AI',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      if (!args || args.length === 0) {
        return await sock.sendMessage(chatId, { text: "Please provide a question." });
      }
      const prompt = args.join(' ');
      const url = `https://api.gurusensei.workers.dev/llama?prompt=${encodeURIComponent(prompt)}`;
      try {
        const { data } = await axios.get(url);
        if (!data?.response?.response) {
          return await sock.sendMessage(chatId, { text: "No response received from LLaMA." });
        }
        const responseText = data.response.response;
        await sock.sendMessage(chatId, {
          text: `*Llama says:*\n\n${responseText.trim()}`,
          contextInfo: {
            externalAdReply: {
              title: 'Flash-MD',
              body: 'Powered by France King',
              mediaType: 1,
              thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
              sourceUrl: 'https://github.com/franceking1/Flash-Md',
              showAdAttribution: true,
              previewType: 0,
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: "LLaMA AI Assistant",
            }
          }
        });
      } catch (error) {
        console.error('LLaMA API Error:', error);
        await sock.sendMessage(chatId, { text: 'An error occurred while getting a response from LLaMA.' });
      }
    }
  },
  {
    name: 'pair',
    aliases: ['pairing', 'generatecode'],
    description: 'Generates a pairing code for a phone number.',
    category: 'User',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      if (!args || args.length === 0) {
        return await sock.sendMessage(chatId, { text: "Please provide a phone number to generate a pairing code." });
      }
      const number = args.join(' ').trim();
      const url = `https://my-sessions.onrender.com/code?number=${encodeURIComponent(number)}`;
      try {
        await sock.sendMessage(chatId, { text: "*Generating your pairing code...*" });
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok || !data?.code) {
          return await sock.sendMessage(chatId, { text: "Could not retrieve the pairing code. Please check the number and try again." });
        }
        await sock.sendMessage(chatId, {
          text: `*Pairing Code for ${number} is the digits below ⤵️!*\n\n\`\`\`${data.code}\`\`\``,
          contextInfo: {
            externalAdReply: {
              title: 'Flash-MD',
              body: 'Powered by France King',
              mediaType: 1,
              thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
              sourceUrl: 'https://github.com/franceking1/Flash-Md',
              showAdAttribution: true,
              previewType: 0,
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: "Pairing Code Info",
            }
          }
        });
      } catch (error) {
        console.error('Pairing Code Error:', error);
        await sock.sendMessage(chatId, { text: "There was an error processing your request. Please try again later." });
      }
    }
  }
];
