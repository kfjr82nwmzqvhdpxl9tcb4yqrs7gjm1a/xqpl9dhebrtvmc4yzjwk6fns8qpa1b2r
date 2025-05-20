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
        name: 'disap7',
        description: 'Enable disappearing messages for 7 days.',
        category: 'Group',
        groupOnly: true,
        adminOnly: true,
        botAdminOnly: true,
        reaction: '👻',

        execute: async (king, msg) => {
            const fromJid = msg.key.remoteJid;
            try {
                await king.groupToggleEphemeral(fromJid, 7 * 24 * 3600);
                await king.sendMessage(fromJid, {
                    text: '⏳ Disappearing messages set to 7 days.'
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to apply setting.'
                }, { quoted: msg });
            }
        }
    },
    {
        name: 'disap90',
        description: 'Enable disappearing messages for 90 days.',
        category: 'Group',
        groupOnly: true,
        adminOnly: true,
        botAdminOnly: true,
        reaction: '👻',

        execute: async (king, msg) => {
            const fromJid = msg.key.remoteJid;
            try {
                await king.groupToggleEphemeral(fromJid, 90 * 24 * 3600);
                await king.sendMessage(fromJid, {
                    text: '⏳ Disappearing messages set to 90 days.'
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to apply setting.'
                }, { quoted: msg });
            }
        }
    },
    {
        name: 'req',
        description: 'List pending group join requests.',
        category: 'Group',
        groupOnly: true,
        adminOnly: true,
        botAdminOnly: true,
        reaction: '☑️',

        execute: async (king, msg) => {
            const fromJid = msg.key.remoteJid;
            try {
                const requests = await king.groupRequestParticipantsList(fromJid);
                if (requests.length === 0) {
                    return king.sendMessage(fromJid, {
                        text: '📭 No pending join requests.'
                    }, { quoted: msg });
                }

                const formatted = requests.map(p => '+' + p.jid.split('@')[0]).join('\n');
                await king.sendMessage(fromJid, {
                    text: `📥 Pending Requests:\n${formatted}\n\nUse *approve* or *reject* to act.`
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to retrieve join requests.'
                }, { quoted: msg });
            }
        }
    }, 

    
{
        name: 'broadcast',
        aliases: ['bc', 'cast'],
        description: 'Send a broadcast message to all groups.',
        category: 'General',
        reaction: '📢',

        execute: async (king, msg, args) => {
            const fromJid = msg.key.remoteJid;
            const msgbc = args.join(' ');

            if (!msgbc) {
                return king.sendMessage(fromJid, {
                    text: '❗ Type your message after the command to broadcast.'
                }, { quoted: msg });
            }

            try {
                const allGroups = await king.groupFetchAllParticipating();
                const groupIds = Object.keys(allGroups);

                await king.sendMessage(fromJid, {
                    text: '*Sending broadcast to all groups...*'
                }, { quoted: msg });

                for (const groupId of groupIds) {
                    const broadcastMsg = `*📢 FLASH-MD BROADCAST*\n\n🗒️ ${msgbc}`;
                    await king.sendMessage(groupId, {
                        image: { url: "https://telegra.ph/file/ee2916cd24336231d8194.jpg" },
                        caption: broadcastMsg
                    });
                }
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Broadcast failed.'
                }, { quoted: msg });
            }
        }
    },
    {
        name: 'disap-off',
        description: 'Turn off disappearing messages.',
        category: 'Group',
        groupOnly: true,
        adminOnly: true,
        botAdminOnly: true,
        reaction: '👻',

        execute: async (king, msg) => {
            const fromJid = msg.key.remoteJid;
            try {
                await king.groupToggleEphemeral(fromJid, 0);
                await king.sendMessage(fromJid, {
                    text: '🗑️ Disappearing messages turned off.'
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to change disappearing message settings.'
                }, { quoted: msg });
            }
        }
    },
    {
        name: 'disap',
        description: 'Instructions for disappearing messages.',
        category: 'Group',
        groupOnly: true,
        adminOnly: true,
        botAdminOnly: true,
        reaction: '👻',

        execute: async (king, msg) => {
            const fromJid = msg.key.remoteJid;
            await king.sendMessage(fromJid, {
                text: '*Enable disappearing messages*\n\nType:\n• *disap1* — 24 hours\n• *disap7* — 7 days\n• *disap90* — 90 days\n• *disap-off* — Turn off'
            }, { quoted: msg });
        }
    },
    {
        name: 'disap1',
        description: 'Set disappearing messages to 24 hours.',
        category: 'Group',
        groupOnly: true,
        adminOnly: true,
        botAdminOnly: true,
        reaction: '👻',

        execute: async (king, msg) => {
            const fromJid = msg.key.remoteJid;
            try {
                await king.groupToggleEphemeral(fromJid, 86400);
                await king.sendMessage(fromJid, {
                    text: '⏳ Disappearing messages set to 24 hours.'
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to set disappearing message timer.'
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
        name: 'invite',
        aliases: ['link'],
        description: 'Get the group invite code.',
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
                const code = await king.groupInviteCode(fromJid);
                await king.sendMessage(fromJid, {
                    text: '🔗 Group invite link: https://chat.whatsapp.com/' + code
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to retrieve the invite link.'
                }, { quoted: msg });
            }
        }
    },
    {
        name: 'revoke',
        aliases: ['reset'],
        description: 'Revoke and generate a new group invite link.',
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
                const code = await king.groupRevokeInvite(fromJid);
                await king.sendMessage(fromJid, {
                    text: '♻️ New invite link: https://chat.whatsapp.com/' + code
                }, { quoted: msg });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to revoke and generate new link.'
                }, { quoted: msg });
            }
        }
    },
    {
        name: 'create',
        aliases: ['newgroup', 'newgc'],
        description: 'Create a new group with specified members.',
        category: 'Group',

        execute: async (king, msg, args) => {
            const fromJid = msg.key.remoteJid;

            if (!args.length) {
                return king.sendMessage(fromJid, {
                    text: '❗ Provide group name and at least one member (mention, reply or number).'
                }, { quoted: msg });
            }

            const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
            const [groupName, ...rest] = args;
            const membersFromArgs = rest.filter(x => /^\d+$/.test(x)).map(num => num + '@s.whatsapp.net');

            const participants = [...new Set([
                ...mentions,
                ...(quotedJid ? [quotedJid] : []),
                ...membersFromArgs
            ])];

            if (!groupName || participants.length === 0) {
                return king.sendMessage(fromJid, {
                    text: 'Usage: .create MyGroup @user or reply or phone numbers (e.g. 2547xxxxxxx)'
                }, { quoted: msg });
            }

            try {
                const group = await king.groupCreate(groupName, participants);
                await king.sendMessage(group.id, {
                    text: '👋 Welcome to the new group!'
                });
            } catch {
                await king.sendMessage(fromJid, {
                    text: '❌ Failed to create the group.'
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
