const now = require('performance-now');
const os = require('os');
const { franceking } = require('../main');

if (!global.botStartTime) global.botStartTime = Date.now();

const getSenderId = (msg) => (msg.key?.participant || msg.key?.remoteJid || '0@s.whatsapp.net').split('@')[0];

const createQuotedContact = (senderId) => ({
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: 'FLASH-MD-V2',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:FLASH-MD-V2\nitem1.TEL;waid=${senderId}:${senderId}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
        },
    },
});

function formatUptime(ms) {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / (1000 * 60)) % 60;
    const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const day = Math.floor(ms / (1000 * 60 * 60 * 24));
    const parts = [];
    if (day > 0) parts.push(`${day} day${day > 1 ? 's' : ''}`);
    if (hr > 0) parts.push(`${hr} h`);
    if (min > 0) parts.push(`${min} m`);
    parts.push(`${sec} s`);
    return parts.join(', ');
}

module.exports = [
    {
        name: 'alive',
        get flashOnly() {
            return franceking();
        },
        aliases: ['status', 'bot'],
        description: 'Check if the bot is alive with uptime and ping.',
        category: 'General',
        execute: async (sock, msg) => {
            const senderId = getSenderId(msg);
            const jid = msg.key.remoteJid;
            const start = now();
            const initialMsg = await sock.sendMessage(jid, {
                text: '🔄 Checking bot status...'
            }, {
                quoted: createQuotedContact(senderId)
            });
            await new Promise(res => setTimeout(res, 1000));
            const latency = (now() - start).toFixed(0);
            const uptime = Date.now() - global.botStartTime;
            const formattedUptime = formatUptime(uptime);
            const platform = os.platform();
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
            const finalText = `🟢 *FLASH-MD-V2 IS ONLINE*

*⏱️ Uptime:* ${formattedUptime}
*🏓 Ping:* ${latency} ms
*🖥️ Platform:* ${platform}
*💾 RAM Usage:* ${ramUsage} MB

_Type *!help* to view all available commands._`;
            await sock.relayMessage(
                jid,
                {
                    protocolMessage: {
                        key: initialMsg.key,
                        type: 14,
                        editedMessage: {
                            conversation: finalText,
                        },
                    },
                },
                {}
            );
        }
    }
];
