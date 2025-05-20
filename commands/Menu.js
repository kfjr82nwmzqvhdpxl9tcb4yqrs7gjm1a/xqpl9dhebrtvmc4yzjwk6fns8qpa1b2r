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
    const hr = Math.floor(ms / (1000 * 60 * 60));
    return `${hr}h ${min}m ${sec}s`;
};

function detectPlatform() {
    if (process.env.RAILWAY_ENVIRONMENT) return 'Railway';
    if (process.env.KOYEB_ENV) return 'Koyeb';
    if (process.env.RENDER) return 'Render';
    if (process.env.GITHUB_ACTIONS) return 'GitHub Actions';
    if (process.env.DYNO) return 'Heroku';
    return 'Linux';
}

module.exports = {
    name: 'menu',
    aliases: ['help', 'commands'],
    description: 'Displays a categorized command list',
    category: 'general',
    execute: async (king, msg, args, fromJid, allCommands) => {
        const time = moment().tz(config.timezone || 'UTC');
        const platform = detectPlatform();
        const uptime = formatUptime(Date.now() - startTime);
        const usedMem = (os.totalmem() - os.freemem()) / 1024 / 1024 / 1024;
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;

        const grouped = {};
        for (const cmd of allCommands) {
            const cat = (cmd.category || 'General').toUpperCase();
            if (!grouped[cat]) grouped[cat] = [];
            if (!grouped[cat].find(c => c.name === cmd.name)) {
                grouped[cat].push(cmd);
            }
        }

        let text = `*◇ FLASH-MD V2 ◇*\n\n`;
        text += `╭──── System Info ────◆\n`;
        text += `│ *Platform:* ${platform}\n`;
        text += `│ *RAM:* ${usedMem.toFixed(2)} / ${totalMem.toFixed(2)} GB\n`;
        text += `│ *Time:* ${time.format('HH:mm:ss')}\n`;
        text += `│ *Date:* ${time.format('DD/MM/YYYY')}\n`;
        text += `│ *Uptime:* ${uptime}\n`;
        text += `╰────────────────────◆\n\n`;

        let counter = 1;
        const categories = Object.keys(grouped).sort();

        for (const cat of categories) {
            text += `*╭──❒ ${applyStyle(cat, 10)} ❒───⊷*\n`;
            text += `│╭────────────\n`;
            grouped[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
                text += `││ ${counter++}. ${applyStyle(cmd.name, 10)}\n`;
            });
            text += `│╰────────────\n`;
            text += `╰══════════════⊷\n\n`;
        }

        const adInfo = {
            externalAdReply: {
                title: `FLASH-MD MENU`,
                body: `Explore all available commands.`,
                mediaType: 1,
                thumbnailUrl: 'https://whatsapp.com/channel/0029VaTbb3p84Om9LRX1jg0P',
                sourceUrl: 'https://github.com/franceking1/Flash-Md-V2',
                showAdAttribution: true,
                previewType: 0,
                newsletterJid: '120363238139244263@newsletter',
                newsletterName: "FLASH-MD V2 Menu"
            }
        };

        await king.sendMessage(fromJid, {
            text,
            contextInfo: adInfo
        }, { quoted: msg });
    }
};
