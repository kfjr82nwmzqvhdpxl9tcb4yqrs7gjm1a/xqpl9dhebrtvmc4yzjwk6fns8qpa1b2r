const DEVS = ['254742063632', '254757835036'];

module.exports = [
    {
        name: 'rename',
        aliases: ['gname'],
        description: 'Change the subject (name) of a group.',
        category: 'Group',
        groupOnly: true,
        adminOnly: true,
        botAdminOnly: true,

        execute: async (king, msg, args) => {
            const fromJid = msg.key.remoteJid;

            if (!fromJid.endsWith('@g.us')) {
                return king.sendMessage(fromJid, {
                    text: '❌ This command only works in groups.'
                }, { quoted: msg });
            }

            const newSubject = args.join(' ');
            if (!newSubject) {
                return king.sendMessage(fromJid, {
                    text: '❗ Please provide a new subject for the group.'
                }, { quoted: msg });
            }

            try {
                await king.groupUpdateSubject(fromJid, newSubject);
                await king.sendMessage(fromJid, {
                    text: `✅ Group name changed to: *${newSubject}*`
                }, { quoted: msg });
            } catch (err) {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to change group name.'
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'left',
        aliases: ['leave'],
        description: 'Force the bot to leave the group.',
        category: 'Group',
        groupOnly: true,

        execute: async (king, msg, args) => {
            const fromJid = msg.key.remoteJid;

            if (!fromJid.endsWith('@g.us')) {
                return king.sendMessage(fromJid, {
                    text: '❌ This command only works in groups.'
                }, { quoted: msg });
            }

            const senderJid = msg.key.participant || msg.key.remoteJid;
            const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];

            const isDev = DEVS.includes(senderNumber);
            if (!isDev) {
                return king.sendMessage(fromJid, {
                    text: '❌ This command is reserved for the bot developer.'
                }, { quoted: msg });
            }

            try {
                await king.groupLeave(fromJid);
            } catch (err) {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to leave the group.'
                }, { quoted: msg });
            }
        }
    }
];
