const axios = require('axios');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const baileys = require('@whiskeysockets/baileys');
const { Sticker } = require('wa-sticker-formatter');
const { Catbox } = require('node-catbox');

const catbox = new Catbox();
const { downloadContentFromMessage } = baileys;

const getBuffer = async (mediaMsg, type) => {
  const stream = await downloadContentFromMessage(mediaMsg, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const uploadToCatbox = async (path) => {
  if (!fs.existsSync(path)) throw new Error("File does not exist");
  const response = await catbox.uploadFile(path);
  if (!response) throw new Error("Failed to upload");
  return response;
};

const contextInfo = {
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363238139244263@newsletter',
    newsletterName: 'FLASH-MD',
    serverMessageId: -1
  }
};

module.exports = [

  {
    name: 's',
    aliases: ['sticker'],
    description: 'Convert image or video to sticker',
    category: 'Converter',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMsg = msg.message?.imageMessage || quoted?.imageMessage;
      const videoMsg = msg.message?.videoMessage || quoted?.videoMessage;

      try {
        if (imageMsg) {
          const buffer = await getBuffer(imageMsg, 'image');
          const sticker = new Sticker(buffer, {
            pack: 'FLASH-MD',
            author: msg.pushName || 'User',
            type: args.includes('crop') ? 'cropped' : 'full',
            quality: 70
          });
          return await sock.sendMessage(chatId, { sticker: await sticker.toBuffer(), contextInfo }, { quoted: msg });
        } else if (videoMsg) {
          const fileName = `video_${Date.now()}.mp4`;
          const webpPath = `sticker_${Date.now()}.webp`;
          const buffer = await getBuffer(videoMsg, 'video');

          await fs.writeFile(fileName, buffer);

          try {
            await new Promise((res, rej) => {
              ffmpeg(fileName)
                .outputOptions([
                  "-vcodec", "libwebp",
                  "-vf", "fps=15,scale=512:512:force_original_aspect_ratio=decrease",
                  "-loop", "0", "-preset", "default", "-an", "-vsync", "0", "-s", "512:512"
                ])
                .save(webpPath)
                .on('end', res).on('error', rej);
            });

            const sticker = new Sticker(await fs.readFile(webpPath), {
              pack: 'FLASH-MD',
              author: msg.pushName || 'User',
              type: 'full',
              quality: 70
            });

            await sock.sendMessage(chatId, { sticker: await sticker.toBuffer(), contextInfo }, { quoted: msg });

          } finally {
            if (await fs.pathExists(fileName)) await fs.unlink(fileName);
            if (await fs.pathExists(webpPath)) await fs.unlink(webpPath);
          }

        } else {
          return await sock.sendMessage(chatId, { text: 'Reply to an image or video to make a sticker.', contextInfo }, { quoted: msg });
        }
      } catch (err) {
        return await sock.sendMessage(chatId, { text: `Error while creating sticker: ${err.message}`, contextInfo }, { quoted: msg });
      }
    }
  },

  {
    name: 'tomp3',
    aliases: ['toaudio', 'audio'],
    description: 'Convert video to audio (mp3)',
    category: 'Converter',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const videoMsg = msg.message?.videoMessage || quoted?.videoMessage;

      if (!videoMsg) {
        return await sock.sendMessage(chatId, { text: 'Reply to a video message to convert to MP3.', contextInfo }, { quoted: msg });
      }

      const fileName = `audio_${Date.now()}.mp4`;
      const mp3Path = `${fileName}.mp3`;

      try {
        const buffer = await getBuffer(videoMsg, 'video');
        await fs.writeFile(fileName, buffer);

        await new Promise((res, rej) => {
          ffmpeg(fileName)
            .output(mp3Path)
            .on('end', res)
            .on('error', rej)
            .run();
        });

        const audio = await fs.readFile(mp3Path);
        await sock.sendMessage(chatId, { audio, mimetype: 'audio/mpeg', contextInfo }, { quoted: msg });

      } catch (err) {
        return await sock.sendMessage(chatId, { text: `Error while converting video to MP3: ${err.message}`, contextInfo }, { quoted: msg });
      } finally {
        if (await fs.pathExists(fileName)) await fs.unlink(fileName);
        if (await fs.pathExists(mp3Path)) await fs.unlink(mp3Path);
      }
    }
  },

  {
    name: 'take',
    description: 'Take sticker with custom pack name',
    category: 'Converter',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const mediaMsg = quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;

      if (!mediaMsg) {
        return await sock.sendMessage(chatId, { text: 'Reply to an image, video or sticker.', contextInfo }, { quoted: msg });
      }

      const type = quoted?.imageMessage ? 'image' :
                   quoted?.videoMessage ? 'video' :
                   quoted?.stickerMessage ? 'sticker' : null;

      if (!type) return await sock.sendMessage(chatId, { text: 'Unsupported media type.', contextInfo }, { quoted: msg });

      const buffer = await getBuffer(mediaMsg, type);
      const filePath = `./temp_${Date.now()}`;
      await fs.writeFile(filePath, buffer);

      try {
        const pack = args.length ? args.join(' ') : msg.pushName || 'Flash-MD';

        const sticker = new Sticker(buffer, {
  pack,
  type: 'full',
  categories: ["🤩", "🎉"],
  id: "12345",
  quality: 70,
  background: "transparent"
});

        const stickerBuffer = await sticker.toBuffer();
        await sock.sendMessage(chatId, { sticker: stickerBuffer, contextInfo }, { quoted: msg });

      } finally {
        if (await fs.pathExists(filePath)) await fs.unlink(filePath);
      }
    }
  },

  {
    name: 'url',
    description: 'Upload media to Catbox and return URL',
    category: 'Converter',
    execute: async (sock, msg) => {
      const chatId = msg.key.remoteJid;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const mediaMsg = quoted?.imageMessage || quoted?.videoMessage;

      if (!mediaMsg) {
        return await sock.sendMessage(chatId, { text: 'Reply to an image or video to upload it.', contextInfo }, { quoted: msg });
      }

      try {
        const type = mediaMsg.imageMessage ? 'image' : 'video';
        const ext = type === 'image' ? 'jpg' : 'mp4';
        const buffer = await getBuffer(mediaMsg, type);
        const filePath = `./media_${Date.now()}.${ext}`;
        await fs.writeFile(filePath, buffer);

        const url = await uploadToCatbox(filePath);
        await sock.sendMessage(chatId, { text: `Here is your URL:\n${url}`, contextInfo }, { quoted: msg });

      } catch (err) {
        return await sock.sendMessage(chatId, { text: `Upload failed: ${err.message}`, contextInfo }, { quoted: msg });
      } finally {
        const path = `./media_${Date.now()}.jpg`; // safe fallback
        if (await fs.pathExists(path)) await fs.unlink(path).catch(() => {});
      }
    }
  }

];
