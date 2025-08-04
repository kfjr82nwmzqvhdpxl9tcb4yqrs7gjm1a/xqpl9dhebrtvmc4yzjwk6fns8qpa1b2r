module.exports = {
  name: 'groupinfo',
  aliases: ['ginfo', 'ginf'],
  groupOnly: true,
  async execute(sock, msg, args, fromJid) {
    try {
      const metadata = await sock.groupMetadata(fromJid);
      const groupName = metadata.subject;
      const groupId = metadata.id;
      const participants = metadata.participants;
      const totalMembers = participants.length;

      const admins = participants.filter(p => p.admin);
      const adminList = admins.map((a, i) => `\n${i + 1}. @${a.id.split('@')[0]}`).join('');

      const ownerJid = metadata.owner || (admins.find(p => p.admin === 'superadmin')?.id);
      const ownerMention = ownerJid ? `@${ownerJid.split('@')[0]}` : 'Unknown';

      const response = `*📄 Group Information:*\n\n` +
        `📌 *Name:* ${groupName}\n` +
        `🆔 *ID:* ${groupId}\n` +
        `👑 *Owner:* ${ownerMention}\n` +
        `👥 *Members:* ${totalMembers}\n` +
        `🛡️ *Admins (${admins.length}):*${adminList}`;

      await sock.sendMessage(fromJid, {
        text: response,
        mentions: [
          ...(ownerJid ? [ownerJid] : []),
          ...admins.map(a => a.id)
        ]
      }, { quoted: msg });
    } catch (err) {
      console.error('❌ Error fetching group info:', err);
      await sock.sendMessage(fromJid, {
        text: '⚠️ Could not fetch group info.'
      }, { quoted: msg });
    }
  }
};
