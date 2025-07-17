const { franceking } = require('../main');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require("fs-extra");
const path = require("path");
const jimp = require("jimp");

const resizeImage = async (imagePath) => {
  const image = await jimp.read(imagePath);
  const resized = image.scaleToFit(720, 720); // Keep full image, fit to 720x720
  return {
    img: await resized.getBufferAsync(jimp.MIME_JPEG),
    preview: await resized.clone().normalize().getBufferAsync(jimp.MIME_JPEG),
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
    name: "grpdp",
    description: "Set group profile picture in full quality (admin only).",
    category: "Group",
    aliases: ["setgrouppp", "grouppp"],
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    get flashOnly() {
      return franceking();
    },

    execute: async (king, msg, args) => {
      const groupId = msg.key.remoteJid;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedImage = quoted?.imageMessage;

      if (!quotedImage) {
        return king.sendMessage(groupId, {
          text: "📸 Please *reply to an image* to set it as the group profile picture.",
        }, { quoted: msg });
      }

      try {
        const buffer = await getBuffer(quotedImage, "image");
        const mediaPath = path.join(__dirname, "..", "temp", `${Date.now()}-grpdp.jpg`);
        fs.ensureDirSync(path.dirname(mediaPath));
        fs.writeFileSync(mediaPath, buffer);

        const resized = await resizeImage(mediaPath);

        // ✅ Send full image and preview
        await king.updateProfilePicture(groupId, resized.img, resized.preview);

        await king.sendMessage(groupId, {
          text: "✅ Group profile picture updated successfully in full quality!",
        }, { quoted: msg });

        fs.unlinkSync(mediaPath);

      } catch (err) {
        console.error("[GRPDP ERROR]", err);
        await king.sendMessage(groupId, {
          text: "❌ Failed to update group profile picture.",
        }, { quoted: msg });
      }
    }
  }
];
