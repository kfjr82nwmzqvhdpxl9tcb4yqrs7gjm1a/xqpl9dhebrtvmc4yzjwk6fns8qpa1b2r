const fs = require('fs');
const path = require('path');
const { franceking } = require('../main');

module.exports = [
  {
    name: 'catshell',
    get flashOnly() {
      return franceking();
    },
    description: 'Sends the JavaScript file of a command.',
    category: 'UTILS',
    ownerOnly: true,
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      const commandName = args[0];

      if (!commandName) {
        return king.sendMessage(fromJid, { text: 'Usage: catshell <commandName>' }, { quoted: msg });
      }

      // Assuming all commands are in "heroku.js"
      const filePath = path.join(__dirname, 'heroku.js');

      try {
        if (!fs.existsSync(filePath)) {
          return king.sendMessage(fromJid, { text: 'Command file not found.' }, { quoted: msg });
        }

        await king.sendMessage(fromJid, {
          document: fs.readFileSync(filePath),
          fileName: `${commandName}.js`,
          mimetype: 'application/javascript'
        }, { quoted: msg });
      } catch (err) {
        await king.sendMessage(fromJid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
      }
    }
  }
];
