const DEVS = ['254742063632', '254757835036']; // Replace with your actual dev numbers

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
            const jid = msg.key.remoteJid;
            const newSubject = args.join(' ');

            if (!newSubject) {
                return king.sendMessage(jid, {
                    text: '❗ Please provide a new subject for the group.'
                }, { quoted: msg });
            }

            try {
                await king.groupUpdateSubject(jid, newSubject);
                await king.sendMessage(jid, {
                    text: `✅ Group name changed to: *${newSubject}*`
                }, { quoted: msg });
            } catch (err) {
                console.error('Failed to change group subject:', err);
                await king.sendMessage(jid, {
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
            const jid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const senderNumber = senderJid.replace(/@.*$/, '').split(':')[0];

            const isDev = DEVS.includes(senderNumber);
            if (!isDev) {
                return king.sendMessage(jid, {
                    text: '❌ This command is reserved for the bot developer.'
                }, { quoted: msg });
            }

            try {
                await king.groupLeave(jid);
            } catch (err) {
                console.error('Failed to leave group:', err);
                await king.sendMessage(jid, {
                    text: '❌ Failed to leave the group.'
                }, { quoted: msg });
            }
        }
    }
];
