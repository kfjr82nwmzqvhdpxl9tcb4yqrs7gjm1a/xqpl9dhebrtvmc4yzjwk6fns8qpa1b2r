function normalizeJid(jid) {
  return jid?.replace('@lid', '@s.whatsapp.net');
}

function getNumber(jid) {
  return normalizeJid(jid)?.split('@')[0];
}

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

      const adminList = admins
        .map((a, i) => `\n${i + 1}. @${getNumber(a.id)}`)
        .join('');

      const ownerJid = metadata.owner || (admins.find(p => p.admin === 'superadmin')?.id);
      const ownerNumber = ownerJid ? getNumber(ownerJid) : 'Unknown';

      const response = `*📄 Group Information:*\n\n` +
        `📌 *Name:* ${groupName}\n` +
        `🆔 *ID:* ${groupId}\n` +
        `👑 *Owner:* @${ownerNumber}\n` +
        `👥 *Members:* ${totalMembers}\n` +
        `🛡️ *Admins (${admins.length}):*${adminList}`;

      await sock.sendMessage(fromJid, {
        text: response,
        mentions: [
          ...(ownerJid ? [normalizeJid(ownerJid)] : []),
          ...admins.map(a => normalizeJid(a.id))
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
