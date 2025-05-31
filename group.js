const moment = require('moment-timezone');

function isGroupJid(jid) {
    return jid.endsWith('@g.us') || jid.endsWith('@lid');
}

module.exports = function groupEventHandler(king) {
    king.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (!isGroupJid(id)) return;

        const metadata = await king.groupMetadata(id).catch(() => null);
        const groupName = metadata?.subject || 'Unknown Group';
        const tz = 'Africa/Nairobi';
        const time = moment().tz(tz).format('hh:mm A, DD MMM YYYY');

        for (const participant of participants) {
            const contact = await king.onWhatsApp(participant).then(([res]) => res?.notify || participant).catch(() => participant);

            switch(action) {
                case 'add':
                case 'invite':
                case 'remove':
                case 'promote':
                case 'demote':
                    break;
            }

            if (action === 'add' || action === 'invite') {
                await king.sendMessage(id, {
                    text: `👋 Welcome @${participant.split('@')[0]} to *${groupName}*!\n\n🕓 Joined at ${time}`,
                    mentions: [participant]
                });
            } else if (action === 'remove') {
                await king.sendMessage(id, {
                    text: `😢 @${participant.split('@')[0]} has left *${groupName}*.\n\n🕓 Left at ${time}`,
                    mentions: [participant]
                });
            } else if (action === 'promote') {
                await king.sendMessage(id, {
                    text: `📢 Congrats @${participant.split('@')[0]}! You have been promoted to admin in *${groupName}*.`,
                    mentions: [participant]
                });
            } else if (action === 'demote') {
                await king.sendMessage(id, {
                    text: `⚠️ @${participant.split('@')[0]} was demoted from admin in *${groupName}*.`,
                    mentions: [participant]
                });
            }
        }
    });

    king.ev.on('groups.update', async updates => {
        for (const update of updates) {
            const id = update.id;
            const metadata = await king.groupMetadata(id).catch(() => null);
            const groupName = metadata?.subject || 'Unknown Group';

            if ('announce' in update) {
                const announceText = update.announce ? 'Group is now *admin-only messaging*.' : 'Group messaging is now *open to all participants*.';
                await king.sendMessage(id, { text: `📢 *${groupName}* settings changed:\n${announceText}` }).catch(() => {});
            }

            if ('restrict' in update) {
                const restrictText = update.restrict ? 'Only admins can edit group info now.' : 'All participants can edit group info now.';
                await king.sendMessage(id, { text: `⚙️ *${groupName}* settings changed:\n${restrictText}` }).catch(() => {});
            }
        }
    });
}
