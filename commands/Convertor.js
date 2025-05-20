const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const axios = require('axios');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const { Catbox } = require('node-catbox');
const baileys = require('@whiskeysockets/baileys');
const { downloadContentFromMessage } = baileys;

const catbox = new Catbox();

module.exports = [
  {
    name: 'sticker',
    aliases: ['s'],
    description: 'Convert image or short video to sticker.',
    category: 'Converter',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const mtype = Object.keys(msg.message || {})[0];
      const isQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const tagImage = isQuoted?.imageMessage;
      const tagVideo = isQuoted?.videoMessage;
      
      const fileName = `sticker_${Date.now()}`;
      const webpPath = `${fileName}.webp`;

      try {
        if (mtype === 'imageMessage' || tagImage) {
          const imageMsg = msg.message.imageMessage || tagImage;
          const buffer = await getBuffer(imageMsg, 'image');

          const sticker = new Sticker(buffer, {
            pack: 'FLASH-MD',
            author: msg.pushName || 'User',
            type: args.includes("crop") ? StickerTypes.CROPPED : StickerTypes.FULL,
            quality: 70
          });

          await sock.sendMessage(chatId, { sticker: await sticker.toBuffer() }, { quoted: msg });
        } else if (mtype === 'videoMessage' || tagVideo) {
          const videoMsg = msg.message.videoMessage || tagVideo;
          const buffer = await getBuffer(videoMsg, 'video');
          const mp4Path = `${fileName}.mp4`;

          await fs.writeFile(mp4Path, buffer);

          await new Promise((resolve, reject) => {
            ffmpeg(mp4Path)
              .outputOptions([
                "-vcodec", "libwebp",
                "-vf", "fps=15,scale=512:512:force_original_aspect_ratio=decrease",
                "-loop", "0",
                "-preset", "default",
                "-an",
                "-vsync", "0",
                "-s", "512:512"
              ])
              .save(webpPath)
              .on('end', resolve)
              .on('error', reject);
          });

          const sticker = new Sticker(await fs.readFile(webpPath), {
            pack: 'FLASH-MD',
            author: msg.pushName || 'User',
            type: args.includes("crop") ? StickerTypes.CROPPED : StickerTypes.FULL,
            quality: 70
          });

          await sock.sendMessage(chatId, { sticker: await sticker.toBuffer() }, { quoted: msg });

          await fs.unlink(mp4Path);
          await fs.unlink(webpPath);
        } else {
          return await sock.sendMessage(chatId, { text: 'Reply to an image or video to convert it into a sticker.' }, { quoted: msg });
        }
      } catch (err) {
        await sock.sendMessage(chatId, { text: `Error while creating sticker: ${err.message}` }, { quoted: msg });
      }
    }
  },
  {
    name: 'url',
    description: 'Get a URL of replied image or video.',
    category: 'Converter',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const mediaMsg = quotedMsg?.imageMessage || quotedMsg?.videoMessage;

      if (!mediaMsg) {
        return await sock.sendMessage(chatId, { text: 'Reply to an image or video to upload it.' }, { quoted: msg });
      }

      try {
        const type = quotedMsg?.imageMessage ? 'image' : 'video';
        const stream = await downloadContentFromMessage(mediaMsg, type);
        const chunks = [];

        for await (const chunk of stream) {
          chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        const ext = type === 'image' ? 'jpg' : 'mp4';
        const filePath = `./media_${Date.now()}.${ext}`;

        await fs.writeFile(filePath, buffer);

        const url = await uploadToCatbox(filePath);
        await sock.sendMessage(chatId, { text: `Below is your Url:\n${url}` }, { quoted: msg });

        await fs.unlink(filePath);
      } catch (err) {
        await sock.sendMessage(chatId, { text: `Upload failed: ${err.message}` }, { quoted: msg });
      }
    }
  },
  {
    name: 'tomp3',
    aliases: ['toaudio', 'audio'],
    description: 'Convert video to MP3 format.',
    category: 'Converter',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const mtype = Object.keys(msg.message || {})[0];
      const isQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const tagVideo = isQuoted?.videoMessage;

      if (mtype !== 'videoMessage' && !tagVideo) {
        return await sock.sendMessage(chatId, { text: 'Reply to a video message to convert to MP3.' }, { quoted: msg });
      }

      const videoMsg = msg.message.videoMessage || tagVideo;

      try {
        const buffer = await getBuffer(videoMsg, 'video');
        const fileName = `audio_${Date.now()}.mp4`;
        const mp3Path = `${fileName}.mp3`;

        await fs.writeFile(fileName, buffer);

        const convertVideoToAudio = () => {
          return new Promise((resolve, reject) => {
            ffmpeg(fileName)
              .output(mp3Path)
              .on('end', resolve)
              .on('error', reject)
              .run();
          });
        };

        await convertVideoToAudio();

        if (fs.existsSync(mp3Path)) {
          const mp3Buffer = await fs.readFile(mp3Path);

          await sock.sendMessage(chatId, { audio: mp3Buffer, mimetype: 'audio/mp3', ptt: false }, { quoted: msg });

          await fs.unlink(fileName);
          await fs.unlink(mp3Path);
        } else {
          await sock.sendMessage(chatId, { text: 'Converted audio file not found.' }, { quoted: msg });
        }
      } catch (err) {
        console.error('Conversion error:', err.message, err.stack);
        await sock.sendMessage(chatId, { text: `Error while converting video to MP3: ${err.message}` }, { quoted: msg });
      }
    }
  },
  {
    name: 'crop',
    description: 'Create a cropped sticker from replied media.',
    category: 'Converter',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const mediaMsg = quotedMsg?.imageMessage || quotedMsg?.videoMessage || quotedMsg?.stickerMessage;

      if (!mediaMsg) {
        return await sock.sendMessage(chatId, { text: 'Reply to an image, video or sticker.' }, { quoted: msg });
      }

      const stream = await downloadContentFromMessage(mediaMsg, mediaMsg.imageMessage ? 'image' : mediaMsg.videoMessage ? 'video' : 'sticker');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const filePath = `./temp_${Date.now()}`;
      await fs.writeFile(filePath, buffer);

      const sticker = new Sticker(filePath, {
        pack: 'Flash-MD',
        type: StickerTypes.CROPPED,
        categories: ["🤩", "🎉"],
        id: "12345",
        quality: 70,
        background: "transparent"
      });

      const stickerBuffer = await sticker.toBuffer();
      await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: msg });
      await fs.unlink(filePath);
    }
  },
  {
    name: 'take',
    description: 'Capture a screenshot from a video and send as image.',
    category: 'Utility',
    execute: async (sock, msg, args) => {
      const chatId = msg.key.remoteJid;
      const mtype = Object.keys(msg.message || {})[0];
      const isQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const tagVideo = isQuoted?.videoMessage;

      if (mtype !== 'videoMessage' && !tagVideo) {
        return await sock.sendMessage(chatId, { text: 'Reply to a video message to capture a screenshot.' }, { quoted: msg });
      }

      const videoMsg = msg.message.videoMessage || tagVideo;

      try {
        const buffer = await getBuffer(videoMsg, 'video');
        const fileName = `screenshot_${Date.now()}.mp4`;
        const imgPath = `${fileName}.jpg`;

        await fs.writeFile(fileName, buffer);

        const captureImage = () => {
          return new Promise((resolve, reject) => {
            ffmpeg(fileName)
              .screenshots({
                timestamps: ['00:00:02.000'],
                filename: imgPath,
                folder: './'
              })
              .on('end', resolve)
              .on('error', reject);
          });
        };

        await captureImage();

        if (fs.existsSync(imgPath)) {
          const imgBuffer = await fs.readFile(imgPath);

          await sock.sendMessage(chatId, { image: imgBuffer, caption: 'Screenshot captured from video.' }, { quoted: msg });

          await fs.unlink(fileName);
          await fs.unlink(imgPath);
        } else {
          await sock.sendMessage(chatId, { text: 'Screenshot not found.' }, { quoted: msg });
        }
      } catch (err) {
        console.error('Capture error:', err.message, err.stack);
        await sock.sendMessage(chatId, { text: `Error while capturing screenshot: ${err.message}` }, { quoted: msg });
      }
    }
  }
];
