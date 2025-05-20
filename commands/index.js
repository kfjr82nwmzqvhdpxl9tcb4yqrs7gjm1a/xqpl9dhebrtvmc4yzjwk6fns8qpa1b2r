const fs = require('fs');
const path = require('path');

const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');
const commands = [];

for (const file of commandFiles) {
    const commandModule = require(path.join(__dirname, file));
    if (Array.isArray(commandModule)) {
        commands.push(...commandModule);
    } else {
        commands.push(commandModule);
    }
}

module.exports = commands;
