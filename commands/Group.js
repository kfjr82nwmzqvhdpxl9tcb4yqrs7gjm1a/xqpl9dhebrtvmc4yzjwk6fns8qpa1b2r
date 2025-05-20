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
            } catch {
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
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to leave the group.'
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'desc',
        aliases: ['gdesc'],
        description: 'Change the description of the group.',
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

            const newDescription = args.join(' ');
            if (!newDescription) {
                return king.sendMessage(fromJid, {
                    text: '❗ Please provide a new description for the group.'
                }, { quoted: msg });
            }

            try {
                await king.groupUpdateDescription(fromJid, newDescription);
                await king.sendMessage(fromJid, {
                    text: `✅ Group description updated to: *${newDescription}*`
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to update group description.'
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'lock',
        aliases: ['close'],
        description: 'Only admins can send messages in the group.',
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

            try {
                await king.groupSettingUpdate(fromJid, 'announcement');
                await king.sendMessage(fromJid, {
                    text: '🔒 Group locked. Only admins can send messages now.'
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to lock the group.'
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'unlock',
        aliases: ['open'],
        description: 'Allow all members to send messages in the group.',
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

            try {
                await king.groupSettingUpdate(fromJid, 'not_announcement');
                await king.sendMessage(fromJid, {
                    text: '🔓 Group unlocked. All members can now send messages.'
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to unlock the group.'
                }, { quoted: msg });
            }
        }
    }
];
