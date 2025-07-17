const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const jimp = require("jimp");

async function resizeImage(buffer) {
  const image = await jimp.read(buffer);
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
  groupOnly: true,
  adminOnly: false,
  botAdminOnly: false,

  async execute(king, msg, args, fromJid) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted?.imageMessage) {
      return king.sendMessage(fromJid, {
        text: "📷 Please reply to an image.",
      }, { quoted: msg });
    }

    try {
      const buffer = await downloadMediaMessage(
        { message: quoted },
        "buffer",
        {},
        { logger: king.logger, reuploadRequest: king.updateMediaMessage }
      );

      const resized = await resizeImage(buffer);

      await king.query({
        tag: 'iq',
        attrs: {
          to: fromJid,
          type: "set",
          xmlns: "w:profile:picture",
        },
        content: [{
          tag: "picture",
          attrs: { type: "image" },
          content: resized.img
        }]
      });

      await king.sendMessage(fromJid, {
        text: "✅ Group profile picture updated!",
      }, { quoted: msg });

    } catch (err) {
      console.error("❌ Error setting profile pic:", err);
      await king.sendMessage(fromJid, {
        text: "❌ Failed to update group profile picture.",
      }, { quoted: msg });
    }
  }
};
