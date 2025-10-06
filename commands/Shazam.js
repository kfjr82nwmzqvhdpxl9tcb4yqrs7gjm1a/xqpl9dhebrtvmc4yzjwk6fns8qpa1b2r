const acrcloud = require("acrcloud");
const yts = require("yt-search");
const { franceking } = require('../main');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

// Create temp folder if not exists
const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

/**
 * Trim 15 seconds from a specific time in the media
 */
function trimClip(inputBuffer, startSeconds = 0) {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(TEMP_DIR, `input-${Date.now()}.mp4`);
    const outputPath = path.join(TEMP_DIR, `trimmed-${Date.now()}.mp4`);
    
    fs.writeFileSync(inputPath, inputBuffer);

    ffmpeg(inputPath)
      .setStartTime(startSeconds)
      .duration(15)
      .output(outputPath)
      .on('end', () => {
        const trimmed = fs.readFileSync(outputPath);
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        resolve(trimmed);
      })
      .on('error', (err) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        reject(err);
      })
      .run();
  });
}

/**
 * Identify song using ACRCloud
 */
async function identifySong(buffer) {
  const acr = new acrcloud({
    host: 'identify-ap-southeast-1.acrcloud.com',
    access_key: '26afd4eec96b0f5e5ab16a7e6e05ab37',
    access_secret: 'wXOZIqdMNZmaHJP1YDWVyeQLg579uK2CfY6hWMN8'
  });

  const result = await acr.identify(buffer);
  if (result.status.code !== 0 || !result.metadata?.music?.length) return null;
  return result.metadata.music[0];
}

module.exports = {
  name: 'shazam',
  aliases: ['whatsong', 'findsong', 'identify'],
  description: 'Identify a song from an audio or video clip.',
  category: 'Search',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg) => {
    const fromJid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
      return king.sendMessage(fromJid, {
        text: '🎵 *Reply to a short audio or video message (10–20 seconds) to identify the song.*'
      }, { quoted: msg });
    }

    try {
      // Download media as buffer
      const mediaBuffer = await downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { logger: console }
      );

      // Try identifying from multiple segments
      const segmentStarts = [0, 60, 120]; // start times in seconds
      let matchedSong = null;

      for (let start of segmentStarts) {
        const clip = await trimClip(mediaBuffer, start);
        matchedSong = await identifySong(clip);
        if (matchedSong) break;
      }

      if (!matchedSong) {
        return king.sendMessage(fromJid, {
          text: '❌ *Song could not be recognized.* Please try again with a clearer or more melodic part of the track.'
        }, { quoted: msg });
      }

      const { title, artists, album, genres, release_date } = matchedSong;
      const ytQuery = `${title} ${artists?.[0]?.name || ''}`;
      const ytSearch = await yts(ytQuery);

      let response = `🎶 *Song Identified!*\n\n`;
      response += `🎧 *Title:* ${title || 'Unknown'}\n`;
      if (artists) response += `👤 *Artist(s):* ${artists.map(a => a.name).join(', ')}\n`;
      if (album?.name) response += `💿 *Album:* ${album.name}\n`;
      if (genres?.length) response += `🎼 *Genre:* ${genres.map(g => g.name).join(', ')}\n`;
      if (release_date) response += `📅 *Released:* ${release_date}\n`;
      if (ytSearch?.videos?.[0]?.url) response += `🔗 *YouTube:* ${ytSearch.videos[0].url}\n`;
      response += `\n🔍 Powered by ACRCloud & YouTube`;

      return king.sendMessage(fromJid, {
        text: response.trim(),
        contextInfo: {
          forwardingScore: 777,
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
        text: '⚠️ *Error:* Unable to recognize the song. Please try again with a clear, short clip (10–20s).'
      }, { quoted: msg });
    }
  }
};
