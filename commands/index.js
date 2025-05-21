const fs = require('fs');
const path = require('path');

const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');
const commands = [];

for (const file of commandFiles) {
    const commandModule = require(path.join(__dirname, file));
    const cmds = Array.isArray(commandModule) ? commandModule : [commandModule];
    for (const cmd of cmds) {
        if (!cmd.name || typeof cmd.name !== 'string') continue;
        commands.push(cmd);
    }
}

module.exports = commands;
