const acrcloud = require("acrcloud");
const yts = require("yt-search");
const { franceking } = require('../main');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

function trimTo15Seconds(inputBuffer, outputPath) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const inputFile = path.join(tempDir, `input-${Date.now()}.mp4`);
    const outputFile = outputPath;

    fs.writeFileSync(inputFile, inputBuffer);

    ffmpeg(inputFile)
      .setStartTime(0)
      .duration(15)
      .output(outputFile)
      .on('end', () => {
        const trimmed = fs.readFileSync(outputFile);
        fs.unlinkSync(inputFile);
        fs.unlinkSync(outputFile);
        resolve(trimmed);
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = {
  name: 'shazam',
  aliases: ['whatsong', 'findsong', 'identify'],
  description: 'Identify a song from a short audio or video and show details.',
  category: 'Search',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg) => {
    const fromJid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
      return king.sendMessage(fromJid, {
        text: '🎵 *Please reply to a short audio or video message (10–15 seconds) to identify the song.*'
      }, { quoted: msg });
    }

    let tempPath = null;
    try {
      // 1. Download media
      const buffer = await downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { logger: console }
      );

      // 2. Trim to 15 seconds
      const tempFileName = `trimmed-${Date.now()}.mp4`;
      tempPath = path.join(__dirname, '..', 'temp', tempFileName);
      const trimmedBuffer = await trimTo15Seconds(buffer, tempPath);

      // 3. Identify with ACRCloud
      const acr = new acrcloud({
        host: 'identify-ap-southeast-1.acrcloud.com',
        access_key: '26afd4eec96b0f5e5ab16a7e6e05ab37',
        access_secret: 'wXOZIqdMNZmaHJP1YDWVyeQLg579uK2CfY6hWMN8'
      });

      const { status, metadata } = await acr.identify(trimmedBuffer);

      if (status.code !== 0 || !metadata?.music?.length) {
        return king.sendMessage(fromJid, {
          text: '❌ *Song could not be recognized.* Please try with a clearer 10–15 second audio or video clip.'
        }, { quoted: msg });
      }

      // 4. Format results
      const music = metadata.music[0];
      const { title, artists, album, genres, release_date } = music;

      const ytQuery = `${title} ${artists?.[0]?.name || ''}`;
      const ytResult = await yts(ytQuery);

      let text = `🎶 *Song Identified!*\n\n`;
      text += `🎧 *Title:* ${title || 'Unknown'}\n`;
      if (artists) text += `👤 *Artist(s):* ${artists.map(a => a.name).join(', ')}\n`;
      if (album?.name) text += `💿 *Album:* ${album.name}\n`;
      if (genres?.length) text += `🎼 *Genre:* ${genres.map(g => g.name).join(', ')}\n`;
      if (release_date) text += `📅 *Released:* ${release_date}\n`;
      if (ytResult?.videos?.[0]?.url) text += `🔗 *YouTube:* ${ytResult.videos[0].url}\n`;
      text += `\n🔍 Powered by ACRCloud & yt-search`;

      // 5. Send final result
      await king.sendMessage(fromJid, {
        text: text.trim(),
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        }
      }, { quoted: msg });

    } catch (err) {
      console.error('[SHZ ERROR]', err);
      return king.sendMessage(fromJid, {
        text: '⚠️ *Error:* Song could not be recognized. Please try again with a different clip (preferably 10–15 seconds).'
      }, { quoted: msg });
    } finally {
      // 6. Cleanup
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          console.error('[CLEANUP ERROR]', cleanupErr);
        }
      }
    }
  }
};
