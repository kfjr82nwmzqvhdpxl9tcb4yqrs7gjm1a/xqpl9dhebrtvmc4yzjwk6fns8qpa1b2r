const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { franceking } = require('../main');

const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

async function saveMedia(msgContent, type = 'file') {
  const buffer = await downloadMediaMessage(msgContent, 'buffer', {}, { logger: console });
  const filename = path.join(tempDir, `${Date.now()}-${type}.bin`);
  fs.writeFileSync(filename, buffer);
  return filename;
}

module.exports = {
  name: 'send',
  description: 'Save and resend a replied message (media/text/sticker).',
  category: 'User',
  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;
    const msgRepondu = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const nomAuteurMessage = msg.pushName || null;

    if (!nomAuteurMessage) {
      return king.sendMessage(fromJid, {
        text: 'Only mods can use this command.'
      }, { quoted: msg });
    }

    if (!msgRepondu) {
      return king.sendMessage(fromJid, {
        text: 'Reply to the message you want to save.'
      }, { quoted: msg });
    }

    let sendMsg;

    try {
      if (msgRepondu.imageMessage) {
        const mediaPath = await saveMedia({ message: { imageMessage: msgRepondu.imageMessage } }, 'image');
        sendMsg = {
          image: { url: mediaPath },
          caption: msgRepondu.imageMessage.caption || ''
        };
      } else if (msgRepondu.videoMessage) {
        const mediaPath = await saveMedia({ message: { videoMessage: msgRepondu.videoMessage } }, 'video');
        sendMsg = {
          video: { url: mediaPath },
          caption: msgRepondu.videoMessage.caption || ''
        };
      } else if (msgRepondu.audioMessage) {
        const mediaPath = await saveMedia({ message: { audioMessage: msgRepondu.audioMessage } }, 'audio');
        sendMsg = {
          audio: { url: mediaPath },
          mimetype: 'audio/mp4'
        };
      } else if (msgRepondu.stickerMessage) {
        const mediaPath = await saveMedia({ message: { stickerMessage: msgRepondu.stickerMessage } }, 'sticker');
        const sticker = new Sticker(mediaPath, {
          pack: 'FLASH-MD',
          type: StickerTypes.CROPPED,
          categories: ['🔥', '⭐'],
          id: 'flash-md-sticker',
          quality: 70,
          background: 'transparent'
        });
        const stickerBuffer = await sticker.toBuffer();
        sendMsg = { sticker: stickerBuffer };
      } else if (msgRepondu?.conversation || msgRepondu?.extendedTextMessage) {
        const textContent = msgRepondu.conversation || msgRepondu.extendedTextMessage?.text || 'Saved message';
        sendMsg = { text: textContent };
      } else {
        return king.sendMessage(fromJid, {
          text: 'Unsupported message type.'
        }, { quoted: msg });
      }

      await king.sendMessage(fromJid, sendMsg, { quoted: msg });

      if (sendMsg.image || sendMsg.video || sendMsg.audio) {
        const filePath = sendMsg.image?.url || sendMsg.video?.url || sendMsg.audio?.url;
        fs.unlink(filePath, err => {
          if (err) console.error('Failed to delete file:', filePath);
        });
      }

    } catch (err) {
      console.error('[SAVE COMMAND ERROR]', err);
      await king.sendMessage(fromJid, {
        text: 'An error occurred while saving the message.'
      }, { quoted: msg });
    }
  }
};
