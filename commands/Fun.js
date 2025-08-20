const { franceking } = require('../main');
const { axios } = require('axios');
module.exports = [
  {
  name: 'hack',
  aliases: ['fakehack', 'h4ck'],
  description: 'Fake hack for fun 😈',
  category: 'Fun',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const creatorNumbers = ['254757835036', '254742063632'];
    const senderNumber = fromJid.replace(/[^0-9]/g, '');

    if (creatorNumbers.includes(senderNumber)) {
      return king.sendMessage(fromJid, {
        text: '🛑 No way, I can\'t hack my creator 🤝🐐'
      }, { quoted: msg });
    }

    const randomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const fakeFiles = ['passwords.txt', 'bank_logins.csv', 'nudes.zip', 'crypto_keys.txt', 'facebook_tokens.json'];
    const randomDevice = [
      'Samsung Galaxy A52', 'Tecno Spark 10', 'Infinix Hot 30',
      'Huawei Y9 Prime', 'iTel S23+', 'Xiaomi Redmi Note 11',
      'Nokia G21', 'Oppo A58', 'Realme C35', 'Vivo Y33s',
      'OnePlus Nord N20', 'HTC U20', 'Motorola G Stylus', 'Sony Xperia 10'
    ];

    const progressSteps = [
      `[▓░░░░░░░░░] 10%`,
      `[▓▓░░░░░░░░] 20%`,
      `[▓▓▓░░░░░░░] 30%`,
      `[▓▓▓▓░░░░░░] 40%`,
      `[▓▓▓▓▓░░░░░] 50%`,
      `[▓▓▓▓▓▓░░░░] 60%`,
      `[▓▓▓▓▓▓▓░░░] 70%`,
      `[▓▓▓▓▓▓▓▓░░] 80%`,
      `[▓▓▓▓▓▓▓▓▓░] 90%`,
      `[▓▓▓▓▓▓▓▓▓▓] 100%`
    ];

    const messages = [
      `🔌 Connecting to device: ${randomDevice[Math.floor(Math.random() * randomDevice.length)]}`,
      `🌐 IP Address: ${randomIP()}`,
      `📡 Signal strength: ▓▓▓▓▓▓▓▓▓▒ 95%`,
      `🧬 Accessing personal files...`,
      `📂 File found: *${fakeFiles[Math.floor(Math.random() * fakeFiles.length)]}*`,
      `📂 File found: *${fakeFiles[Math.floor(Math.random() * fakeFiles.length)]}*`,
      `🧾 Reading browser history...`,
      `🔍 Found suspicious activity on dark web...`,
      `💸 Linked bank accounts detected...`,
      `🚨 Transferring ₿ crypto assets...`,
      `🧪 Injecting malware into WhatsApp backup...`,
      `💾 Download complete.`,
      `🧹 Deleting traces...`,
      `💀 Hack complete. Target is now under our control.`,
      `🛑 *Warning:* This hack has triggered a report to Interpol. Good luck 😈`
    ];

    const progressMsg = await king.sendMessage(fromJid, {
      text: `💻 Hacking progress:\n${progressSteps[0]}`
    }, { quoted: msg });

    for (let i = 1; i < progressSteps.length; i++) {
      await sleep(1000);
      await king.relayMessage(
        fromJid,
        {
          protocolMessage: {
            key: progressMsg.key,
            type: 14,
            editedMessage: {
              conversation: `💻 Hacking progress:\n${progressSteps[i]}`
            }
          }
        },
        {}
      );
    }

    for (const line of messages) {
      await sleep(1500);
      await king.sendMessage(fromJid, {
        text: line
      }, { quoted: msg });
    }
  }
  }, 

{
  name: 'anime',
  aliases: ['animesearch'],
  description: 'Search for anime info using Jikan API 📺',
  category: 'Search',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const animeName = args.join(" ");
    if (!animeName) {
      return king.sendMessage(fromJid, {
        text: "Please provide an anime name. Example: *.anime One Piece*"
      }, { quoted: msg });
    }

    try {
      await king.sendMessage(fromJid, {
        text: `🔍 Searching for information on *${animeName}*...`
      }, { quoted: msg });

      const responseInfo = await axios.get(`https://api.jikan.moe/v4/anime?q=${animeName}`);
      const results = responseInfo.data?.data;

      if (!results || results.length === 0) {
        return king.sendMessage(fromJid, {
          text: `Could not find the anime "${animeName}".`
        }, { quoted: msg });
      }

      const animeData = results.find(a => a.type !== 'Music' && a.type !== 'OVA' && a.type !== 'Special') || results[0];

      let nextEpisodeText = "Information not available.";
      try {
        const airingInfo = animeData.aired?.to || animeData.aired?.from;
        if (airingInfo) {
          const date = new Date(airingInfo);
          nextEpisodeText = date > new Date()
            ? `Airing on ${date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}`
            : "Already aired.";
        } else if (animeData.status !== "Currently Airing") {
          nextEpisodeText = "The anime has finished airing.";
        }
      } catch (e) {}

      const title = animeData.title_japanese
        ? `${animeData.title} (${animeData.title_japanese})`
        : animeData.title;
      const synopsis = animeData.synopsis
        ? animeData.synopsis.substring(0, 300) + '...'
        : 'No synopsis available.';
      const score = animeData.score ? `${animeData.score}/10 ⭐` : 'N/A';
      const episodesInfo = animeData.episodes ? `${animeData.episodes} episodes` : 'N/A';

      const message = `📺 *${title}*\n\n` +
                      `*Status:* ${animeData.status}\n` +
                      `*Score:* ${score}\n` +
                      `*Episodes:* ${episodesInfo}\n\n` +
                      `*Synopsis:*\n${synopsis}\n\n` +
                      `*Next Episode:* ${nextEpisodeText}`;

      await king.sendMessage(fromJid, {
        image: { url: animeData.images.jpg.large_image_url },
        caption: message
      }, { quoted: msg });

    } catch (error) {
      await king.sendMessage(fromJid, {
        text: "An error occurred during the search. The API might be overloaded or returned incomplete data."
      }, { quoted: msg });
    }
  }
},  
 {
  name: 'love',
  aliases: ['compatibility', 'lovetest'],
  description: 'Calculate love compatibility between two people ❤️',
  category: 'Fun',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const senderName = msg.pushName || 'User';
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const quotedName = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
    let user1 = senderName;
    let user2 = '';

    if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      user2 = quotedName.replace(/@s\.whatsapp\.net$/, '');
    } else if (args.length > 0) {
      user2 = args.join(' ');
    } else {
      return king.sendMessage(fromJid, {
        text: 'Please mention someone or reply to their message. Example: *.love @Marie*'
      }, { quoted: msg });
    }

    const percentage = Math.floor(Math.random() * 101);
    let emoji = '❤️';
    if (percentage < 25) emoji = '💔';
    else if (percentage < 50) emoji = '🤔';
    else if (percentage < 75) emoji = '😊';
    else emoji = '💖';

    const response = `--- Compatibility Test ---\n\n` +
                     `❤️ Person 1: *${user1}*\n` +
                     `❤️ Person 2: *${user2}*\n\n` +
                     `Their compatibility is: *${percentage}%* ${emoji}`;

    await king.sendMessage(fromJid, { text: response }, { quoted: msg });
  }
}, 
   {
  name: 'flip',
  aliases: ['coin', 'toss'],
  description: 'Toss a coin and get HEADS or TAILS 🪙',
  category: 'Fun',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const coinMsg = await king.sendMessage(fromJid, {
      text: '🪙 Tossing the coin in the air...'
    }, { quoted: msg });

    await sleep(1000);

    await king.relayMessage(
      fromJid,
      {
        protocolMessage: {
          key: coinMsg.key,
          type: 14,
          editedMessage: {
            conversation: '🌀 The coin is spinning... spinning...'
          }
        }
      },
      {}
    );

    await sleep(1500);

    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';

    const finalText = `🪙 The coin has landed!\n\nResult: It's *${result}*!`;

    await king.relayMessage(
      fromJid,
      {
        protocolMessage: {
          key: coinMsg.key,
          type: 14,
          editedMessage: {
            conversation: finalText
          }
        }
      },
      {}
    );
  }
} ];
