const { franceking } = require('../main');
const { S_WHATSAPP_NET, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require("fs-extra");
const path = require("path");
const jimp = require("jimp");

const resizeImage = async (imagePath) => {
  const image = await jimp.read(imagePath);
  const resized = image.crop(0, 0, image.getWidth(), image.getHeight()).scaleToFit(720, 720);
  return {
    img: await resized.getBufferAsync(jimp.MIME_JPEG),
    preview: await resized.normalize().getBufferAsync(jimp.MIME_JPEG),
  };
};

async function getBuffer(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = [
  {
    name: "gpp",
    description: "Set group profile picture using raw query (admin only).",
    category: "WhatsApp",
    aliases: ["setgpp", "groupdp"],
    groupOnly: true,
    adminOnly: true,
    get flashOnly() {
      return franceking();
    },

    execute: async (king, msg, args, { isBotAdmin }) => {
      const fromJid = msg.key.remoteJid;

      if (!isBotAdmin) {
        return king.sendMessage(fromJid, {
          text: "🚫 I need to be *admin* to change the group profile picture.",
        }, { quoted: msg });
      }

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedImage = quoted?.imageMessage;

      if (!quotedImage) {
        return king.sendMessage(fromJid, {
          text: "📸 Please *reply to an image* to set it as the group profile picture.",
        }, { quoted: msg });
      }

      try {
        const buffer = await getBuffer(quotedImage, "image");
        const mediaPath = path.join(__dirname, "..", "temp", `${Date.now()}_group.jpg`);
        fs.ensureDirSync(path.dirname(mediaPath));
        await fs.promises.writeFile(mediaPath, buffer);

        const resized = await resizeImage(mediaPath);

        await king.query({
          tag: "iq",
          attrs: {
            to: fromJid, // group JID, e.g. 123456789@g.us
            type: "set",
            xmlns: "w:profile:picture",
          },
          content: [{
            tag: "picture",
            attrs: { type: "image" },
            content: resized.img,
          }],
        });

        await king.sendMessage(fromJid, {
          text: "✅ Group profile picture updated successfully!",
        }, { quoted: msg });

        await fs.promises.unlink(mediaPath);

      } catch (err) {
        console.error("[GPP ERROR]", err);
        await king.sendMessage(fromJid, {
          text: `❌ Failed to update group profile picture.\n\n*Error:* ${err.message}`,
        }, { quoted: msg });
      }
    }
  }
];
