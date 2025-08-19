const { franceking } = require('../main');

module.exports = {
  name: 'hack',
  aliases: ['fakehack', 'h4ck'],
  description: 'Fake hack. ',
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
      `🧠 Initiating hack...`,
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
      `💀 Hack complete. Target is now under our control.`
    ];

    for (const bar of progressSteps) {
      await king.sendMessage(fromJid, { text: `💻 Hacking progress:\n${bar}` }, { quoted: msg });
      await sleep(1000);
    }

    await sleep(1000);

    for (const line of messages) {
      await king.sendMessage(fromJid, { text: line }, { quoted: msg });
      await sleep(1300);
    }

    await king.sendMessage(fromJid, {
      text: `🛑 *Warning:* This hack has triggered a report to Interpol. Good luck 😈`,
    }, { quoted: msg });
  }
};
