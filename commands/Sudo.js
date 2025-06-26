const { normalizeJid } = require('../main');
const { saveSudoList } = require('../utils/sudoStore');

module.exports = {
  name: 'sudo',
  description: 'Add or remove users from allowed list.',
  category: 'Owner',
  ownerOnly: true,

  async execute(king, msg, args) {
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const isAdd = args[0] === 'add';
    const isDel = args[0] === 'del';

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant ||
                   msg.message?.extendedTextMessage?.contextInfo?.remoteJid;

    if (!quoted) {
      return king.sendMessage(msg.key.remoteJid, {
        text: '❌ Please reply to a user\'s message to add/remove sudo access.'
      }, { quoted: msg });
    }

    const jid = normalizeJid(quoted);
    const number = jid.split('@')[0];

    if (isAdd) {
      global.ALLOWED_USERS.add(number);
      saveSudoList(global.ALLOWED_USERS);
      return king.sendMessage(msg.key.remoteJid, {
        text: `✅ Added +${number} to allowed users.`
      }, { quoted: msg });
    } else if (isDel) {
      global.ALLOWED_USERS.delete(number);
      saveSudoList(global.ALLOWED_USERS);
      return king.sendMessage(msg.key.remoteJid, {
        text: `❌ Removed +${number} from allowed users.`
      }, { quoted: msg });
    } else {
      return king.sendMessage(msg.key.remoteJid, {
        text: 'Usage:\n- `sudo add` (reply to user)\n- `sudo del` (reply to user)'
      }, { quoted: msg });
    }
  }
};
