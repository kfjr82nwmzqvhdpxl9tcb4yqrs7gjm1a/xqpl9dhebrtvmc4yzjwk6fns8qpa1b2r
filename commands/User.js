const restrictedJIDs = [
  "254742063632@s.whatsapp.net",
  "254750948696@s.whatsapp.net",
  "254757835036@s.whatsapp.net",
  "254751284190@s.whatsapp.net"
];

function formatJid(input) {
  const cleaned = input.replace(/[^0-9]/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

function isOwner(msg) {
  const sender = msg.key.participant || msg.key.remoteJid;
  return sender === global.KING_ID || [
    '254742063632@s.whatsapp.net',
    '254757835036@s.whatsapp.net'
  ].includes(sender);
}

module.exports = [
  {
    name: 'block',
    description: 'Blocks a user on WhatsApp.',
    category: 'USER',
    ownerOnly: true,
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      let targetJid;

      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
      } else if (args.length > 0) {
        targetJid = args[0].includes('@s.whatsapp.net') ? args[0] : formatJid(args[0]);
      } else if (fromJid.endsWith('@s.whatsapp.net')) {
        targetJid = fromJid;
      } else {
        return king.sendMessage(fromJid, { text: "Please mention or provide a number to block." }, { quoted: msg });
      }

      if (restrictedJIDs.includes(targetJid)) {
        return king.sendMessage(fromJid, { text: "I'm sorry, I cannot block my developer!!" }, { quoted: msg });
      }

      try {
        await king.updateBlockStatus(targetJid, "block");
        await king.sendMessage(fromJid, { text: `✅ Blocked ${targetJid} successfully.` }, { quoted: msg });
      } catch (error) {
        await king.sendMessage(fromJid, { text: "❌ Error occurred while blocking the user." }, { quoted: msg });
      }
    }
  },

  {
    name: 'unblock',
    description: 'Unblocks a user on WhatsApp.',
    category: 'USER',
    ownerOnly: true,
    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;
      let targetJid;

      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
      } else if (args.length > 0) {
        targetJid = args[0].includes('@s.whatsapp.net') ? args[0] : formatJid(args[0]);
      } else if (fromJid.endsWith('@s.whatsapp.net')) {
        targetJid = fromJid;
      } else {
        return king.sendMessage(fromJid, { text: "Please mention or provide a number to unblock." }, { quoted: msg });
      }

      if (restrictedJIDs.includes(targetJid)) {
        return king.sendMessage(fromJid, { text: "You cannot unblock the developer using this command." }, { quoted: msg });
      }

      try {
        await king.updateBlockStatus(targetJid, "unblock");
        await king.sendMessage(fromJid, { text: `✅ Unblocked ${targetJid} successfully.` }, { quoted: msg });
      } catch (error) {
        await king.sendMessage(fromJid, { text: "❌ Error occurred while unblocking the user." }, { quoted: msg });
      }
    }
  }
];

