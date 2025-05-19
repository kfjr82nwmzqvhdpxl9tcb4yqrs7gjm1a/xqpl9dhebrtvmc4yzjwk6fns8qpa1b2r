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
        aliases: ['latency'],
        description: 'Responds with pong',
        execute: async (sock, msg) => {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' });
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
