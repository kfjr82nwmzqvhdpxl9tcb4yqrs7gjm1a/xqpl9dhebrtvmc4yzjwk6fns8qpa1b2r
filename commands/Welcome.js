const { franceking } = require('../main');
const db = require('../db');

module.exports = [
  {
    name: 'welcome',
    get flashOnly() {
      return franceking();
    },
    description: 'Enable/disable welcome messages and set welcome text',
    category: 'Group',
    adminOnly: true,
    botAdminOnly: true,
    groupOnly: true,

    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      const option = args[0]?.toLowerCase();

      if (!option || !['on', 'off', 'set'].includes(option)) {
        return king.sendMessage(fromJid, {
          text: '❌ Usage:\n.welcome on - Enable welcome messages\n.welcome off - Disable welcome messages\n.welcome set <message> - Set welcome message text\n\nUse placeholders: @user and @group'
        }, { quoted: msg });
      }

      if (option === 'on' || option === 'off') {
        const enabled = option === 'on';
        const oldConfig = await db.getGroupWelcome(fromJid);
        const message = oldConfig?.message || '👋 Welcome @user to @group!';
        await db.setGroupWelcome(fromJid, enabled, message);

        return king.sendMessage(fromJid, {
          text: `✅ Welcome messages *${enabled ? 'enabled' : 'disabled'}*`
        }, { quoted: msg });
      }

      if (option === 'set') {
        const messageText = args.slice(1).join(' ');
        if (!messageText) {
          return king.sendMessage(fromJid, {
            text: '❌ Please provide the welcome message text after .welcome set\n\nPlaceholders: @user, @group'
          }, { quoted: msg });
        }

        const oldConfig = await db.getGroupWelcome(fromJid);
        const enabled = oldConfig?.enabled || false;

        await db.setGroupWelcome(fromJid, enabled, messageText);

        return king.sendMessage(fromJid, {
          text: '✅ Welcome message updated successfully!'
        }, { quoted: msg });
      }
    }
  }
];
