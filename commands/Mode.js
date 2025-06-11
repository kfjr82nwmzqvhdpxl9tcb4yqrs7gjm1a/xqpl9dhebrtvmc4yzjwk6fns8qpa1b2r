const conf = require('../config');

module.exports = {
  name: 'mode',
  aliases: [],
  description: 'Change bot mode (public/private)',
  ownerOnly: true,
  flashOnly: false,
  groupOnly: false,
  adminOnly: false,

  async execute(client, msg, args) {
    const from = msg.key.remoteJid;
    const modeArg = (args[0] || '').toLowerCase();

    if (!['public', 'private'].includes(modeArg)) {
      return client.sendMessage(from, {
        text: `❌ Invalid mode.\nUsage: mode public | private`
      }, { quoted: msg });
    }

    conf.MODE = modeArg;

    return client.sendMessage(from, {
      text: `✅ Mode updated: *${modeArg.toUpperCase()}*`
    }, { quoted: msg });
  }
};
