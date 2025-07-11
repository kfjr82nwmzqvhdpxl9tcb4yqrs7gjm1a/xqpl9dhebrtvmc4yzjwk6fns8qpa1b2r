const fs = require('fs');
const path = require('path');

module.exports = [
  {
    name: 'cmdinfo',
    aliases: ['commandinfo', 'infocmd'],
    description: 'Gets info (name, aliases, description) about a specific command.',
    category: 'User',
    ownerOnly: true,
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      const commandName = args[0];

      if (!commandName) {
        return king.sendMessage(fromJid, { text: '❗ Usage: cmdinfo <commandName>' }, { quoted: msg });
      }

      const commandsDir = __dirname;
      const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
      let commandInfo = null;

      for (const file of files) {
        const filePath = path.join(commandsDir, file);
        const commandModule = require(filePath);

        // 
        const commands = Array.isArray(commandModule) ? commandModule : [commandModule];

        for (const cmd of commands) {
          if (
            cmd.name === commandName ||
            (cmd.aliases && cmd.aliases.includes(commandName))
          ) {
            commandInfo = cmd;
            break;
          }
        }

        if (commandInfo) break;
      }

      if (!commandInfo) {
        return king.sendMessage(fromJid, { text: `❌ Command *${commandName}* not found.` }, { quoted: msg });
      }

      let infoText = `📦 *Command Info:*\n\n`;
      infoText += `🔹 *Name:* ${commandInfo.name}\n`;
      infoText += `🔹 *Aliases:* ${(commandInfo.aliases || []).join(', ') || 'None'}\n`;
      infoText += `🔹 *Description:* ${commandInfo.description || 'No description'}\n`;
      infoText += `🔹 *Category:* ${commandInfo.category || 'Uncategorized'}\n`;
      infoText += `🔹 *Owner Only:* ${commandInfo.ownerOnly ? 'Yes' : 'No'}\n`;

      king.sendMessage(fromJid, { text: infoText }, { quoted: msg });
    }
  }
];
