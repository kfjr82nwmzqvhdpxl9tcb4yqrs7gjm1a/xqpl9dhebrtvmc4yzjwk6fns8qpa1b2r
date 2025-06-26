const fs = require('fs');
const path = require('path');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { franceking } = require('../main');

module.exports = {
  name: 'send',
  description: 'Save and forward a replied message (media/text/sticker) to its author.',
  category: 'User',
  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;
    const msgRepondu = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const auteurMessage = msg.message?.extendedTextMessage?.contextInfo?.participant || null;
    const nomAuteurMessage = msg.pushName || null;

    if (!nomAuteurMessage) {
      return king.sendMessage(fromJid, {
        text: 'Only mods can use this command.'
      }, { quoted: msg });
    }

    if (!msgRepondu || !auteurMessage) {
      return king.sendMessage(fromJid, {
        text: 'Mention the message you want to save by replying to it.'
      }, { quoted: msg });
    }

    let sendMsg;

    try {
      // IMAGE
      if (msgRepondu.imageMessage) {
        const mediaPath = await king.downloadAndSaveMediaMessage({ message: { imageMessage: msgRepondu.imageMessage } });
        sendMsg = {
          image: { url: mediaPath },
          caption: msgRepondu.imageMessage.caption || ''
        };

      // VIDEO
      } else if (msgRepondu.videoMessage) {
        const mediaPath = await king.downloadAndSaveMediaMessage({ message: { videoMessage: msgRepondu.videoMessage } });
        sendMsg = {
          video: { url: mediaPath },
          caption: msgRepondu.videoMessage.caption || ''
        };

      // AUDIO
      } else if (msgRepondu.audioMessage) {
        const mediaPath = await king.downloadAndSaveMediaMessage({ message: { audioMessage: msgRepondu.audioMessage } });
        sendMsg = {
          audio: { url: mediaPath },
          mimetype: 'audio/mp4'
        };

      // STICKER
      } else if (msgRepondu.stickerMessage) {
        const mediaPath = await king.downloadAndSaveMediaMessage({ message: { stickerMessage: msgRepondu.stickerMessage } });
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

      // TEXT
      } else if (msgRepondu?.conversation || msgRepondu?.extendedTextMessage) {
        const textContent = msgRepondu.conversation || msgRepondu.extendedTextMessage?.text || 'Saved message';
        sendMsg = { text: textContent };

      } else {
        return king.sendMessage(fromJid, {
          text: 'Unsupported message type.'
        }, { quoted: msg });
      }

      await king.sendMessage(auteurMessage, sendMsg);

      // Optional: Clean up file if saved
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
