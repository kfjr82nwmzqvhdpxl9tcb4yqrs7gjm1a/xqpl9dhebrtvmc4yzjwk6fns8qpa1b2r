const moment = require('moment-timezone');
const db = require('./db');

function isGroupJid(jid) {
  return jid.endsWith('@g.us') || jid.endsWith('@lid');
}

module.exports = function groupEventHandler(king) {
  king.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!isGroupJid(id)) return;

    const metadata = await king.groupMetadata(id).catch(() => null);
    const groupName = metadata?.subject || 'Unknown Group';

    const welcomeConfig = await db.getGroupWelcome(id);
    if (!welcomeConfig?.enabled) return;

    const tz = 'Africa/Nairobi';
    const time = moment().tz(tz).format('hh:mm A, DD MMM YYYY');

    for (const participant of participants) {
      let mentionName = participant.split('@')[0];

      const contactInfo = await king.onWhatsApp(participant).then(([res]) => res).catch(() => null);

      if (contactInfo?.notify) {
        mentionName = contactInfo.notify;
      } else {
        const participantInfo = metadata?.participants.find(p => p.id === participant);
        if (participantInfo) {
          mentionName = participantInfo.id.split('@')[0];
        } else if (participant.endsWith('@lid')) {
          mentionName = `User${mentionName}`;
        }
      }

      if (action === 'add' || action === 'invite') {
        let text = welcomeConfig.message || '👋 Welcome @user to @group!';
        text = text.replace(/@user/gi, `@${mentionName}`);
        text = text.replace(/@group/gi, groupName);

        await king.sendMessage(id, {
          text: `${text}\n\n🕓 Joined at ${time}`,
          mentions: [participant]
        });
      }
    }
  });
};
