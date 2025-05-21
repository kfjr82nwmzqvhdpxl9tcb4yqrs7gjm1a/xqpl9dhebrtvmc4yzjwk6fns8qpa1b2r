const os = require('os');
const moment = require('moment-timezone');
const config = require('../config.js');

const startTime = Date.now();

const styles = {
    10: {
        "a": "ᴀ", "b": "ʙ", "c": "ᴄ", "d": "ᴅ", "e": "ᴇ", "f": "ғ", "g": "ɢ", "h": "ʜ", "i": "ɪ", "j": "ᴊ",
        "k": "ᴋ", "l": "ʟ", "m": "ᴍ", "n": "ɴ", "o": "ᴏ", "p": "ᴘ", "q": "ϙ", "r": "ʀ", "s": "s", "t": "ᴛ",
        "u": "ᴜ", "v": "v", "w": "ᴡ", "x": "x", "y": "ʏ", "z": "ᴢ",
        "A": "ᴀ", "B": "ʙ", "C": "ᴄ", "D": "ᴅ", "E": "ᴇ", "F": "ғ", "G": "ɢ", "H": "ʜ", "I": "ɪ", "J": "ᴊ",
        "K": "ᴋ", "L": "ʟ", "M": "ᴍ", "N": "ɴ", "O": "ᴏ", "P": "ᴘ", "Q": "ϙ", "R": "ʀ", "S": "s", "T": "ᴛ",
        "U": "ᴜ", "V": "v", "W": "ᴡ", "X": "x", "Y": "ʏ", "Z": "ᴢ"
    }
};

const applyStyle = (text, styleNum) => {
    const map = styles[styleNum];
    return text.split('').map(c => map[c] || c).join('');
};

const formatUptime = ms => {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / (1000 * 60)) % 60;
    const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const day = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (day) parts.push(`${day} ${day > 1 ? 'days' : 'day'}`);
    if (hr) parts.push(`${hr} ${hr > 1 ? 'h' : 'hour'}`);
    if (min) parts.push(`${min} ${min > 1 ? 'm' : 'minute'}`);
    if (sec || parts.length === 0) parts.push(`${sec} s`);
    return parts.join(', ');
};

const detectPlatform = () => {
    if (process.env.RAILWAY_ENVIRONMENT) return 'Railway';
    if (process.env.KOYEB_ENV) return 'Koyeb';
    if (process.env.RENDER) return 'Render';
    if (process.env.GITHUB_ACTIONS) return 'GitHub Actions';
    if (process.env.DYNO) return 'Heroku';
    return 'Linux';
};

module.exports = [
    {
        name: 'menu',
        aliases: ['help', 'commands'],
        description: 'Displays categorized list of commands',
        category: 'System',
        execute: async (king, msg, args, allCommands) => {
            const fromJid = msg.key.remoteJid;
            const time = moment().tz(config.timezone || 'Africa/Lagos');
            const uptime = formatUptime(Date.now() - startTime);
            const platform = detectPlatform();
            const usedMem = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);
            const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

            const categorized = {};
            for (const cmd of allCommands) {
                const category = cmd.category ? cmd.category.toUpperCase() : 'GENERAL';
                if (!categorized[category]) categorized[category] = [];
                categorized[category].push(cmd);
            }

            let text = `*◇ FLASH-MD V2 MENU ◇*\n\n`;
            text += `╭──── System Info ────◆\n`;
            text += `│ *Platform:* ${platform}\n`;
            text += `│ *RAM:* ${usedMem}/${totalMem} GB\n`;
            text += `│ *Time:* ${time.format('HH:mm:ss')}\n`;
            text += `│ *Date:* ${time.format('DD/MM/YYYY')}\n`;
            text += `│ *Uptime:* ${uptime}\n`;
            text += `╰────────────────────◆\n\n`;

            let counter = 1;
            const sortedCategories = Object.keys(categorized).sort();
            for (const category of sortedCategories) {
                text += `*╭──❒ ${applyStyle(category, 10)} ❒───⊷*\n`;
                text += `│╭────────────\n`;
                const sortedCommands = categorized[category].filter(c => c.name).sort((a, b) => a.name.localeCompare(b.name));
                for (const cmd of sortedCommands) {
                    text += `││ ${counter++}. ${applyStyle(cmd.name, 10)}\n`;
                }
                text += `│╰────────────\n`;
                text += `╰══════════════⊷\n\n`;
            }

            await king.sendMessage(fromJid, {
                text,
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
        }
    },
    {
        name: 'help',
        aliases: [],
        description: 'Provides help and guide for new users',
        category: 'System',
        execute: async (king, msg, args, allCommands) => {
            const fromJid = msg.key.remoteJid;
            let text = `*🛠️ FLASH-MD-V2 USER GUIDE*\n\n`;
            text += `To use the bot:\n`;
            text += `• Start commands with the prefix\n`;
            text += `• Use .menu to view all available commands\n`;
            text += `*COMMANDS LIST:*\n\n`;

            const categorized = {};
            for (const cmd of allCommands) {
                const category = cmd.category ? cmd.category.toUpperCase() : 'GENERAL';
                if (!categorized[category]) categorized[category] = [];
                categorized[category].push(cmd);
            }

            for (const [cat, cmds] of Object.entries(categorized)) {
                text += `📂 *${cat}*\n`;
                for (const cmd of cmds) {
                    text += `• *${cmd.name}* - ${cmd.description}`;
                    if (cmd.aliases?.length) {
                        text += ` (Aliases: ${cmd.aliases.join(', ')})`;
                    }
                    text += `\n`;
                }
                text += `\n`;
            }

            await king.sendMessage(fromJid, {
                text,
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
        }
    }
];
