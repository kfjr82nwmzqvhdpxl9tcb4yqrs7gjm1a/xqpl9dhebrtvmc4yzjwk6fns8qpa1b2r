module.exports = {
  name: 'info',
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
      const ownerJid = metadata.owner || (admins.find(p => p.admin === 'superadmin')?.id);
      
      
      async function getDisplayNumber(jid) {
        if (!jid) return 'Unknown';

        if (jid.endsWith('@s.whatsapp.net')) {
          return jid.split('@')[0];
        }

        if (jid.endsWith('@lid')) {
          try {
            const result = await sock.onWhatsApp(jid);
            const waJid = result?.[0]?.jid;
            return waJid ? waJid.split('@')[0] : jid.split('@')[0];
          } catch (err) {
            console.warn('Failed to resolve LID:', jid);
            return jid.split('@')[0];
          }
        }

        return jid.split('@')[0];
      }

      
      const ownerNumber = await getDisplayNumber(ownerJid);

      
      const adminList = await Promise.all(admins.map(async (a, i) => {
        const number = await getDisplayNumber(a.id);
        return `${i + 1}. @${number}`;
      }));

      
      const response = `*📄 Group Information:*\n\n` +
        `📌 *Name:* ${groupName}\n` +
        `🆔 *ID:* ${groupId}\n` +
        `👑 *Owner:* @${ownerNumber}\n` +
        `👥 *Members:* ${totalMembers}\n` +
        `🛡️ *Admins (${admins.length}):*\n${adminList.join('\n')}`;

      
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
