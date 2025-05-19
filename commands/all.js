const now = require('performance-now');

module.exports = [
    {
        name: 'hi',
        aliases: ['hello', 'hey'],
        description: 'Sends a greeting',
        execute: async (sock, msg) => {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Hi! How can I assist you today?' });
        }
    },
    {
        name: 'ping',
        aliases: ['latency', 'speed'],
        description: "Checks the bot's response time",
        execute: async (sock, msg) => {
            const start = now();
            const senderId = (msg.key?.participant || msg.key?.remoteJid || '0@s.whatsapp.net').split('@')[0];
            const jid = msg.key.remoteJid;

            const pingMsg = await sock.sendMessage(jid, { text: 'Pinging...' }, {
                quoted: {
                    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
                    message: {
                        contactMessage: {
                            displayName: 'FLASH-MD-V2',
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:'FLASH-MD-V2'\nitem1.TEL;waid=${senderId}:${senderId}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
                        },
                    },
                }
            });

            const latency = (now() - start).toFixed(0);

            await sock.relayMessage(
                jid,
                {
                    protocolMessage: {
                        key: pingMsg.key,
                        type: 14,
                        editedMessage: {
                            conversation: `🏓 Pong!\n⏱️ *_Flash-MD-V2 Speed: ${latency} ms_*`,
                        },
                    },
                },
                {}
            );
        }
    },
    {
        name: 'uptime',
        aliases: ['runtime'],
        description: 'Displays the system uptime!',
        execute: async (sock, msg) => {
            if (!global.botStartTime) global.botStartTime = Date.now();
            const currentTime = Date.now();
            const seconds = Math.floor((currentTime - global.botStartTime) / 1000);
            const formatted = formatUptime(seconds);

            const senderId = (msg.key?.participant || msg.key?.remoteJid || '0@s.whatsapp.net').split('@')[0];
            const jid = msg.key.remoteJid;

            await sock.sendMessage(jid, {
                text: `*_UPTIME OF FLASH-MD-V2: ${formatted}_*`
            }, {
                quoted: {
                    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
                    message: {
                        contactMessage: {
                            displayName: 'FLASH-MD-V2',
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:'FLASH-MD-V2'\nitem1.TEL;waid=${senderId}:${senderId}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
                        },
                    },
                }
            });
        }
    },
    {
        name: 'help',
        aliases: ['commands'],
        description: 'Lists all commands',
        execute: async (sock, msg, args, allCommands) => {
            const list = allCommands.map(cmd => `*${cmd.name}* (${cmd.aliases.join(', ')}) - ${cmd.description}`).join('\n');
            await sock.sendMessage(msg.key.remoteJid, { text: list });
        }
    }
];

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);

    return parts.join(', ') || '0s';
}
