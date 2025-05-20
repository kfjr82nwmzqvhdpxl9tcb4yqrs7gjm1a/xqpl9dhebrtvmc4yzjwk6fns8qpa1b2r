const axios = require('axios');

module.exports = [

  {
    name: 'llama',
    aliases: ['ilama'],
    description: 'Ask LLaMA AI a question or prompt.',
    category: 'AI',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      if (!args || args.length === 0) {
        return await sock.sendMessage(chatId, { text: "Please provide a question to ask LLaMA." });
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
          text: `*LLaMA says:*\n\n${responseText.trim()}`,
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
        console.error('LLaMA API Error:', error);
        await sock.sendMessage(chatId, { text: "An error occurred while getting a response from LLaMA." });
      }
    }
  },

  {
    name: 'pair',
    aliases: ['pairing', 'generatecode'],
    description: 'Generates a pairing code for a phone number.',
    category: 'General',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      if (!args || args.length === 0) {
        return await sock.sendMessage(chatId, { text: "Please provide a phone number to generate a pairing code." });
      }

      const number = args.join(' ').trim();
      const url = `https://my-sessions.onrender.com/code?number=${encodeURIComponent(number)}`;

      try {
        await sock.sendMessage(chatId, { text: "*FLASH-MD is generating your pairing code...*" });

        const response = await axios.get(url);
        const data = response.data;

        if (!data?.code) {
          return await sock.sendMessage(chatId, { text: "Could not retrieve the pairing code. Please check the number and try again." });
        }

        await sock.sendMessage(chatId, {
          text: `*Pairing Code for ${number} is the digits below ⤵️!*\n\n> *Powered by FLASH-MD*`,
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

        await sock.sendMessage(chatId, {
          text: `\`\`\`${data.code}\`\`\``
        });

      } catch (error) {
        console.error('Pairing Code Error:', error);
        await sock.sendMessage(chatId, { text: "There was an error processing your request. Please try again later." });
      }
    }
  }, 

  
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
      } catch (error) {
        console.error('Time Command Error:', error);
        await sock.sendMessage(chatId, { text: "An error occurred while fetching the time information." });
      }
    }
  }
];

