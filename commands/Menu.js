const fs = require('fs');
const path = require('path');
const os = require('os');
const moment = require('moment-timezone');
const config = require('../config.js');

function detectPlatform() {
    if (process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_ENVIRONMENT) return 'Railway';
    if (process.env.KOYEB_ENV) return 'Koyeb';
    if (process.env.RENDER) return 'Render';
    if (process.env.GITHUB_WORKFLOW || process.env.GITHUB_ACTIONS) return 'GitHub Actions';
    if (process.env.DYNO) return 'Heroku';
    return 'Unknown (Linux)';
}

const __dirname = path.dirname(require.resolve('.'));
const commandsPath = path.resolve(__dirname);
const startTime = Date.now();

const styles = {
    10: {
        "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
        "a": "ᴀ", "b": "ʙ", "c": "ᴄ", "d": "ᴅ", "e": "ᴇ", "f": "ғ", "g": "ɢ", "h": "ʜ", "i": "ɪ", "j": "ᴊ",
        "k": "ᴋ", "l": "ʟ", "m": "ᴍ", "n": "ɴ", "o": "ᴏ", "p": "ᴘ", "q": "ϙ", "r": "ʀ", "s": "s", "t": "ᴛ",
        "u": "ᴜ", "v": "v", "w": "ᴡ", "x": "x", "y": "ʏ", "z": "ᴢ", "A": "ᴀ", "B": "ʙ", "C": "ᴄ", "D": "ᴅ",
        "E": "ᴇ", "F": "ғ", "G": "ɢ", "H": "ʜ", "I": "ɪ", "J": "ᴊ", "K": "ᴋ", "L": "ʟ", "M": "ᴍ", "N": "ɴ",
        "O": "ᴏ", "P": "ᴘ", "Q": "ϙ", "R": "ʀ", "S": "s", "T": "ᴛ", "U": "ᴜ", "V": "v", "W": "ᴡ", "X": "x",
        "Y": "ʏ", "Z": "ᴢ"
    }
};

const applyStyle = (text, styleNumber) => {
    const styleMap = styles[styleNumber];
    return text.split('').map(char => styleMap[char] || char).join('');
};

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];

    if (d > 0) parts.push(`${d} day${d > 1 ? 's' : ''}`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);

    return parts.join(', ') || '0s';
}

async function getAllCommands() {
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js') && f !== 'help_menu.js');
    const allCommands = {};
    for (const file of files) {
        const mod = require(path.join(commandsPath, file));
        Object.entries(mod).forEach(([key, val]) => {
            if (val?.name) {
                if (!val.category) val.category = 'general';
                allCommands[val.name] = val;
                if (val.aliases) {
                    val.aliases.forEach(alias => {
                        allCommands[alias] = val;
                    });
                }
            }
        });
    }
    return allCommands;
}

module.exports = {
    name: 'menu',
    aliases: ['help', 'commands'],
    description: 'Displays categorized list of commands',
    execute: async (king, msg, args, allCommands) => {
        const fromJid = msg.key.remoteJid;

        const categorized = {};

        for (const cmd of allCommands) {
            const category = cmd.category ? cmd.category.toUpperCase() : 'GENERAL';
            if (!categorized[category]) categorized[category] = [];
            categorized[category].push(cmd);
        }

        let menuText = `*📜 FLASH-MD-V2 COMMAND MENU*\n\n`;

        for (const category in categorized) {
            menuText += `*🔖 ${category}*\n`;
            for (const cmd of categorized[category]) {
                const aliases = cmd.aliases?.length ? ` (Aliases: ${cmd.aliases.join(', ')})` : '';
                menuText += `• *${global.prefix}${cmd.name}*${aliases} - ${cmd.description}\n`;
            }
            menuText += '\n';
        }

        menuText += `_Use commands with the prefix: *${global.prefix}*_\nExample: *${global.prefix}ping*`;

        try {
            await king.sendMessage(fromJid, {
                text: menuText,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363238139244263@newsletter',
                        newsletterName: 'FLASH-MD',
                        serverMessageId: -1
                    }
                }
            });
        } catch (error) {
            console.error('Error in menu command:', error);
            await king.sendMessage(fromJid, {
                text: '❌ Error displaying the command menu.'
            });
        }
    }
};

module.exports = {
    name: 'help',
    description: 'Displays help for commands or lists all available commands.',
    category: 'general',
    execute: async (king, msg, args, jid) => {
        const commands = await getAllCommands();

        if (args[0]) {
            const commandName = args[0].toLowerCase();
            const command = commands[commandName];
            if (command) {
                let response = `*◇ FLASH-MD COMMANDS Help◇*\n\n`;
                const category = (command.category || 'general').toUpperCase();
                response += `*❒ ${category} ❒*\n`;
                response += `- ${command.name} - ${command.description}\n`;

                if (command.aliases && command.aliases.length > 0) {
                    response += `\n*Aliases:*\n`;
                    response += command.aliases.map(a => `- ${a}`).join('\n');
                }

                const adInfo = {
                    externalAdReply: {
                        title: `FLASH-MD HELP`,
                        body: `Explore all available commands.`,
                        mediaType: 1,
                        thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
                        sourceUrl: 'https://github.com/franceking1/Flash-Md',
                        showAdAttribution: true,
                        previewType: 0,
                        newsletterJid: '120363238139244263@newsletter',
                        newsletterName: "FLASH-MD Command Help",
                    }
                };

                await king.sendMessage(jid, { 
                    text: response, 
                    contextInfo: adInfo,
                }, { quoted: msg });
            } else {
                await king.sendMessage(jid, { text: '❌ *Command not found!*' }, { quoted: msg });
            }
        } else {
            const grouped = {};

            Object.values(commands).forEach(cmd => {
                const category = (cmd.category || 'general').toUpperCase();
                if (!grouped[category]) grouped[category] = [];
                if (!grouped[category].some(c => c.name === cmd.name)) {
                    grouped[category].push(cmd);
                }
            });

            let helpText = `*◇ FLASH-MD COMMANDS ◇*\n\n`;
            const sortedCategories = Object.keys(grouped).sort();

            for (const category of sortedCategories) {
                helpText += `*❒ ${category} ❒*\n`;
                const sortedCmds = grouped[category].sort((a, b) => a.name.localeCompare(b.name));
                for (const cmd of sortedCmds) {
                    const aliasText = (cmd.aliases && cmd.aliases.length > 0)
                        ? ` (aliases: ${cmd.aliases.join(', ')})`
                        : '';
                    helpText += `- ${cmd.name}${aliasText} - ${cmd.description}\n`;
                }
                helpText += `\n`;
            }

            const adInfo = {
                externalAdReply: {
                    title: `FLASH-MD HELP`,
                    body: `Explore all available commands.`,
                    mediaType: 1,
                    thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
                    sourceUrl: 'https://github.com/franceking1/Flash-Md',
                    showAdAttribution: true,
                    previewType: 0,
                    newsletterJid: '120363238139244263@newsletter',
                    newsletterName: "FLASH-MD Help",
                }
            };

            await king.sendMessage(jid, { 
                text: helpText.trim(), 
                contextInfo: adInfo,
            }, { quoted: msg });
        }
    }
};
