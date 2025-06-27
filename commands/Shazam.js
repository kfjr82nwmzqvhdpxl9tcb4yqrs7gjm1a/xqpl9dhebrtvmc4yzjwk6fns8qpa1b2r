const acrcloud = require("acrcloud");
const yts = require("yt-search");
const { franceking } = require('../main');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'shazam',
  aliases: ['whatsong', 'findsong'],
  description: 'Identify a song from a short audio or video and show details.',
  category: 'Search',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg) => {
    const fromJid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

    if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
      return king.sendMessage(fromJid, {
        text: '🎵 *Reply to a short audio or video to identify the song.*'
      }, { quoted: msg });
    }

    try {
      const buffer = await downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { logger: console }
      );

      const acr = new acrcloud({
        host: 'identify-ap-southeast-1.acrcloud.com',
        access_key: '26afd4eec96b0f5e5ab16a7e6e05ab37',
        access_secret: 'wXOZIqdMNZmaHJP1YDWVyeQLg579uK2CfY6hWMN8'
      });

      const { status, metadata } = await acr.identify(buffer);
      if (status.code !== 0 || !metadata?.music?.length) {
        return king.sendMessage(fromJid, {
          text: `❌ Could not recognize the song. Try again.`
        }, { quoted: msg });
      }

      const music = metadata.music[0];
      const { title, artists, album, genres, release_date } = music;

      let result = `🎶 *Song Identified!*\n`;
      result += `\n🎧 *Title:* ${title}`;
      if (artists) result += `\n👤 *Artist(s):* ${artists.map(a => a.name).join(', ')}`;
      if (album) result += `\n💿 *Album:* ${album.name}`;
      if (genres) result += `\n🎼 *Genre:* ${genres.map(g => g.name).join(', ')}`;
      if (release_date) result += `\n📅 *Released:* ${release_date}`;

      // YouTube optional
      const search = await yts(`${title} ${artists?.[0]?.name || ''}`);
      if (search?.videos?.length) {
        result += `\n🔗 *YouTube:* ${search.videos[0].url}`;
      }

      return king.sendMessage(fromJid, {
        text: result.trim()
      }, { quoted: msg });

    } catch (err) {
      console.error('[SHZ ERROR]', err);
      return king.sendMessage(fromJid, {
        text: '⚠️ Song not recognizable. Try again with clearer or shorter audio.'
      }, { quoted: msg });
    }
  }
};
