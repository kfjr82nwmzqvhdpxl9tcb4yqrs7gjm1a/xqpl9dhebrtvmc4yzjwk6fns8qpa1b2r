const fs = require('fs');
const path = require('path');

const commands = [];

const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');

for (const file of files) {
    const command = require(path.join(__dirname, file));
    if (command && command.name) {
        commands.push(command);
    }
}

module.exports = commands;
