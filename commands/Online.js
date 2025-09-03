const { franceking } = require('../main');
const { getOnlineMembers } = require('../france/Presence');

module.exports = {
  name: 'online',
  aliases: ['whoonline', 'isonline'],
  description: 'List currently online group members.',
  category: 'utility',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args, fromJid) => {
    try {
      const isGroup = fromJid.endsWith('@g.us');
      if (!isGroup) {
        return king.sendMessage(fromJid, {
          text: '❌ This command can only be used in groups.'
        }, { quoted: msg });
      }

      const online = await getOnlineMembers(king, fromJid);

      if (!online.length) {
        return king.sendMessage(fromJid, {
          text: '👥 No online members detected (or they have privacy enabled).'
        }, { quoted: msg });
      }

      const onlineList = online.map(jid => `🟢 @${jid.split('@')[0]}`).join('\n');

      await king.sendMessage(fromJid, {
        text: `🧾 *Online Group Members:*\n\n${onlineList}`,
        mentions: online
      }, { quoted: msg });

    } catch (err) {
      await king.sendMessage(fromJid, {
        text: `❌ Error fetching online users:\n\n${err.message}`
      }, { quoted: msg });
    }
  }
};
