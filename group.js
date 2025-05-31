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
            const contactInfo = await king.onWhatsApp(participant).then(([res]) => res).catch(() => null);
            const mentionName = contactInfo?.notify || participant.split('@')[0];

            await king.sendMessage(id, {
                text:
                    action === 'add' || action === 'invite' ? `👋 Welcome @${mentionName} to *${groupName}*!\n\n🕓 Joined at ${time}` :
                    action === 'remove' ? `😢 @${mentionName} has left *${groupName}*.\n\n🕓 Left at ${time}` :
                    action === 'promote' ? `📢 Congrats @${mentionName}! You have been promoted to admin in *${groupName}*.` :
                    action === 'demote' ? `⚠️ @${mentionName} was demoted from admin in *${groupName}*.` :
                    '',
                mentions: [participant]
            });
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
