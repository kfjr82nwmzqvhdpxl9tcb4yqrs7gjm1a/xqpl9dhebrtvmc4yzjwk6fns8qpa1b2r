const fs = require('fs');
const path = require('path');

const commandFiles = fs.readdirSync(__dirname).filter(file => file !== 'index.js' && file.endsWith('.js'));

let all = [];

for (const file of commandFiles) {
    const commands = require(path.join(__dirname, file));
    all = all.concat(commands);
}

module.exports = all;
