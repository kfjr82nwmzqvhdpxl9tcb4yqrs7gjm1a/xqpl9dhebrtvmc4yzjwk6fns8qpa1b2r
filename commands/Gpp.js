const { S_WHATSAPP_NET } = require('@whiskeysockets/baileys');
const fs = require("fs-extra");
const jimp = require("jimp");

async function resizeImage(imagePath) {
  const image = await jimp.read(imagePath);
  const resized = image
    .crop(0, 0, image.getWidth(), image.getHeight())
    .scaleToFit(720, 720);
  return {
    img: await resized.getBufferAsync(jimp.MIME_JPEG),
    preview: await resized.normalize().getBufferAsync(jimp.MIME_JPEG),
  };
}

module.exports = {
  name: "fullgpp",
  category: "Group",
  description: "Set group profile picture without compression",
  aliases: ["fullgp", "gpp"],
  groupOnly: true,
  adminOnly: false,
  botAdminOnly: false,
  ownerOnly: false,

  async execute(king, msg, args, fromJid) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!fromJid.endsWith('@g.us')) {
      return king.sendMessage(fromJid, {
        text: "❌ This command only works in groups.",
      }, { quoted: msg });
    }

    if (!quoted?.imageMessage) {
      return king.sendMessage(fromJid, {
        text: "📷 Please reply to an image to set as group profile picture.",
      }, { quoted: msg });
    }

    try {
      const imagePath = await king.downloadAndSaveMediaMessage(quoted.imageMessage);
      const resized = await resizeImage(imagePath);

      await king.query({
        tag: 'iq',
        attrs: {
          to: S_WHATSAPP_NET,
          type: "set",
          xmlns: "w:profile:picture",
          target: fromJid
        },
        content: [{
          tag: "picture",
          attrs: { type: "image" },
          content: resized.img
        }]
      });

      await fs.promises.unlink(imagePath);

      return king.sendMessage(fromJid, {
        text: "✅ Group profile picture updated!",
      }, { quoted: msg });

    } catch (err) {
      console.error("❌ Error setting profile pic:", err);
      return king.sendMessage(fromJid, {
        text: "❌ Failed to update group profile picture.",
      }, { quoted: msg });
    }
  }
};
