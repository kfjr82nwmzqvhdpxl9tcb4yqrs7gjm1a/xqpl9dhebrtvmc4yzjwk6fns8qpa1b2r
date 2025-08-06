const { franceking } = require('../main');
const axios = require('axios');

module.exports = [
  {
    name: 'serie-a',
    get flashOnly() {
      return franceking();
    },
    description: 'Serie-a command',
    category: 'Sports',
    execute: async (king, msg, args, fromJid) => {
      try {
        const res = await axios.get('https://api.dreaded.site/api/standings/SA');
        const standings = res.data.data;

        const message = `TABLE STANDINGS FOR SERIE-A\n\n${standings}`;

        await king.sendMessage(fromJid, {
          text: message,
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
      } catch (error) {
        await king.sendMessage(fromJid, {
          text: '⚠️ Something went wrong. Unable to fetch Serie A standings.',
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
    name: 'tinyurl',
    get flashOnly() {
      return franceking();
    },
    aliases: ['shorturl'],
    description: 'Tinyurl command',
    category: 'General',
    execute: async (king, msg, args, fromJid) => {
      const text = args.join(' ');
      if (!text) {
        return king.sendMessage(fromJid, {
          text: "Please provide a URL to shorten.",
        }, { quoted: msg });
      }

      const urlRegex = /^(http:\/\/|https:\/\/)[^\s/$.?#].[^\s]*$/i;
      if (!urlRegex.test(text)) {
        return king.sendMessage(fromJid, {
          text: "That doesn't appear to be a valid URL.",
        }, { quoted: msg });
      }

      try {
        const res = await axios.get(`https://api.dreaded.site/api/shorten-url?url=${encodeURIComponent(text)}`);
        const data = res.data;

        if (!data || data.status !== 200 || !data.result || !data.result.shortened_url) {
          return king.sendMessage(fromJid, {
            text: "We are sorry, but the URL shortening service didn't respond correctly. Please try again later.",
          }, { quoted: msg });
        }

        const shortenedUrl = data.result.shortened_url;
        const originalUrl = data.result.original_url;

        await king.sendMessage(fromJid, {
          text: `*Original URL*: ${originalUrl}\n\n*Shortened URL*: ${shortenedUrl}`,
        }, { quoted: msg });

      } catch (e) {
        console.error("Error occurred:", e);
        await king.sendMessage(fromJid, {
          text: "An error occurred while shortening the URL. Please try again later.",
        }, { quoted: msg });
      }
    }
  }
];
