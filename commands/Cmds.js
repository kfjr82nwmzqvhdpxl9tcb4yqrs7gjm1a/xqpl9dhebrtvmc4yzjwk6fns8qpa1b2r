const fs = require('fs');
const path = require('path');
const util = require('util');

module.exports = [
  {
    name: 'structure',
    aliases: ['cmdstruct', 'getcmdstruct'],
    description: 'Returns the raw structure of a command (as a JS object).',
    category: 'User',
    ownerOnly: true,
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      const commandName = args[0];

      if (!commandName) {
        return king.sendMessage(fromJid, { text: '❗ Usage: getstructure <commandName>' }, { quoted: msg });
      }

      const commandsDir = __dirname;
      const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
      let commandObject = null;

      for (const file of files) {
        const filePath = path.join(commandsDir, file);
        let commandModule;
        try {
          delete require.cache[require.resolve(filePath)];
          commandModule = require(filePath);
        } catch (err) {
          continue;
        }

        const commands = Array.isArray(commandModule) ? commandModule : [commandModule];

        for (const cmd of commands) {
          if (
            cmd.name === commandName ||
            (cmd.aliases && cmd.aliases.includes(commandName))
          ) {
            commandObject = cmd;
            break;
          }
        }

        if (commandObject) break;
      }

      if (!commandObject) {
        return king.sendMessage(fromJid, { text: `❌ Command *${commandName}* not found.` }, { quoted: msg });
      }

      const commandText = util.inspect(commandObject, { depth: null, compact: false });

      if (commandText.length > 4000) {
        const filePath = path.join(__dirname, `${commandObject.name}_structure.txt`);
        fs.writeFileSync(filePath, commandText);

        await king.sendMessage(fromJid, {
          document: fs.readFileSync(filePath),
          fileName: `${commandObject.name}_structure.txt`,
          mimetype: 'text/plain'
        }, { quoted: msg });

        fs.unlinkSync(filePath);
      } else {
        await king.sendMessage(fromJid, { text: '```js\n' + commandText + '\n```' }, { quoted: msg });
      }
    }
  }
];
