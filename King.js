const fs = require('fs');
const path = require('path');

function loadExternalCommands() {
  const commandsDir = path.join(__dirname, 'franceking1', 'Flash-Md-V2', 'commands');
  const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
  const commands = [];

  for (const file of commandFiles) {
    const command = require(path.join(commandsDir, file));
    if (command.name) {
      commands.push(command);
    }
  }

  return commands;
}

module.exports = { loadExternalCommands };
