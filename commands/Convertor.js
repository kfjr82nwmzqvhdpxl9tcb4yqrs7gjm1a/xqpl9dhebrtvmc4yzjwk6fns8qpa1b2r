const axios = require('axios');
const fs = require('fs-extra');
const ffmpegPath = require('ffmpeg-static'); 
const ffmpeg = require('fluent-ffmpeg'); 
ffmpeg.setFfmpegPath(ffmpegPath); 
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
  const response = await catbox.uploadFile({ path });
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
  name: 'sticker',
  aliases: ['s'],
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
        const inputPath = `./video_${Date.now()}.mp4`;
        const outputPath = `./sticker_${Date.now()}.webp`;
        const buffer = await getBuffer(videoMsg, 'video');
        await fs.writeFile(inputPath, buffer);

        try {
          await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
              .setFfmpegPath(ffmpegPath)
              .outputOptions([
                "-vcodec", "libwebp",
                "-vf", "fps=15,scale=512:512:force_original_aspect_ratio=decrease",
                "-loop", "0",
                "-preset", "default",
                "-an",
                "-vsync", "0"
              ])
              .output(outputPath)
              .on("end", resolve)
              .on("error", reject)
              .run();
          });

          const sticker = new Sticker(await fs.readFile(outputPath), {
            pack: 'FLASH-MD',
            author: msg.pushName || 'User',
            type: 'full',
            quality: 70
          });

          await sock.sendMessage(chatId, { sticker: await sticker.toBuffer(), contextInfo }, { quoted: msg });

        } catch (err) {
          return await sock.sendMessage(chatId, { text: `FFmpeg error: ${err.message}`, contextInfo }, { quoted: msg });
        } finally {
          if (await fs.pathExists(inputPath)) await fs.unlink(inputPath);
          if (await fs.pathExists(outputPath)) await fs.unlink(outputPath);
        }

      } else {
        return await sock.sendMessage(chatId, { text: 'Reply to an image or video to make a sticker.', contextInfo }, { quoted: msg });
      }
    } catch (err) {
      return await sock.sendMessage(chatId, { text: `Sticker error: ${err.message}`, contextInfo }, { quoted: msg });
    }
  }
},
  {
  name: 'crop',
  description: 'Create cropped sticker from media',
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
    const filePath = `./temp_crop_${Date.now()}`;
    await fs.writeFile(filePath, buffer);

    try {
      const pack = args.length ? args.join(' ') : msg.pushName || 'Flash-MD';

      const sticker = new Sticker(buffer, {
        pack,
        author: pack,
        type: 'cropped',
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

    const inputPath = `./video_${Date.now()}.mp4`;
    const outputPath = `./audio_${Date.now()}.mp3`;

    try {
      const buffer = await getBuffer(videoMsg, 'video');
      await fs.writeFile(inputPath, buffer);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setFfmpegPath(ffmpegPath)
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      const audio = await fs.readFile(outputPath);
      await sock.sendMessage(chatId, { audio, mimetype: 'audio/mpeg', contextInfo }, { quoted: msg });

    } catch (err) {
      console.error('Error during conversion:', err);
      return await sock.sendMessage(chatId, { text: `Error while converting video to MP3: ${err.message}`, contextInfo }, { quoted: msg });
    } finally {
      if (await fs.pathExists(inputPath)) await fs.unlink(inputPath);
      if (await fs.pathExists(outputPath)) await fs.unlink(outputPath);
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
    const mediaMsg = quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;

    if (!mediaMsg) {
      return await sock.sendMessage(chatId, { text: 'Reply to an image, video, or sticker to upload.', contextInfo }, { quoted: msg });
    }

    let type = null;
    let ext = null;

    if (quoted?.imageMessage) {
      type = 'image';
      ext = 'jpg';
    } else if (quoted?.videoMessage) {
      type = 'video';
      ext = 'mp4';
    } else if (quoted?.stickerMessage) {
      type = 'sticker';
      ext = 'webp';
    }

    if (!type || !ext) {
      return await sock.sendMessage(chatId, { text: 'Unsupported media type.', contextInfo }, { quoted: msg });
    }

    const filePath = `./media_${Date.now()}.${ext}`;

    try {
      const buffer = await getBuffer(mediaMsg, type);
      await fs.writeFile(filePath, buffer);

      const url = await uploadToCatbox(filePath);
      await sock.sendMessage(chatId, { text: `Here is your URL:\n${url}`, contextInfo }, { quoted: msg });

    } catch (err) {
      return await sock.sendMessage(chatId, { text: `Upload failed: ${err.message}`, contextInfo }, { quoted: msg });
    } finally {
if (await fs.pathExists(filePath)) await fs.unlink(filePath);
    }
  }
}

];
