const acrcloud = require("acrcloud");
const yts = require("yt-search");
const { franceking } = require('../main');

module.exports = {
  name: 'shazam',
  aliases: ['whatsong', 'findsong'],
  description: 'Identify a song from a short audio or video and show details.',
  category: 'Search',

  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;

    // Determine if the message is a reply
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const messageContent = quotedMsg || msg.message;

    // Get mime type
    const mime =
      messageContent?.audioMessage ? 'audio' :
      messageContent?.videoMessage ? 'video' :
      '';

    if (!mime) {
      return king.sendMessage(fromJid, {
        text: '🎵 *Reply to a short audio or video to identify the song.*',
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        }
      }, { quoted: msg });
    }

    try {
      // Download the media
      const buffer = await king.downloadMediaMessage({ message: quotedMsg || msg.message });

      const acr = new acrcloud({
        host: 'identify-ap-southeast-1.acrcloud.com',
        access_key: '26afd4eec96b0f5e5ab16a7e6e05ab37',
        access_secret: 'wXOZIqdMNZmaHJP1YDWVyeQLg579uK2CfY6hWMN8'
      });

      const { status, metadata } = await acr.identify(buffer);
      if (status.code !== 0) {
        return king.sendMessage(fromJid, {
          text: `❌ ${status.msg}`
        }, { quoted: msg });
      }

      const music = metadata.music[0];
      const { title, artists, album, genres, release_date } = music;

      const query = `${title} ${artists?.[0]?.name || ''}`;
      const search = await yts(query);
      const video = search.videos[0];

      let result = `🎶 *Song Identified!*\n`;
      result += `\n🎧 *Title:* ${title}`;
      if (artists) result += `\n👤 *Artist(s):* ${artists.map(a => a.name).join(', ')}`;
      if (album) result += `\n💿 *Album:* ${album.name}`;
      if (genres) result += `\n🎼 *Genre:* ${genres.map(g => g.name).join(', ')}`;
      if (release_date) result += `\n📅 *Released:* ${release_date}`;
      if (video?.url) result += `\n🔗 *YouTube:* ${video.url}`;

      return king.sendMessage(fromJid, {
        text: result.trim(),
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        }
      }, { quoted: msg });

    } catch (err) {
      console.error('[SHZ] Error:', err);
      return king.sendMessage(fromJid, {
        text: '⚠️ Could not recognize the song. Try again with a clearer or shorter audio.',
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363238139244263@newsletter',
            newsletterName: 'FLASH-MD',
            serverMessageId: -1
          }
        }
      }, { quoted: msg });
    }
  }
};
