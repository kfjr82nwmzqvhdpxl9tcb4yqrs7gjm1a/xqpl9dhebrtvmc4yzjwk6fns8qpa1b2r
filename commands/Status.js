const axios = require('axios');
const { franceking } = require('../main');
const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'status',
  description: 'Send a story/status update to selected users.',
  category: 'Broadcast',
  get flashOnly() {
    return franceking();
  },
  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;

    const caption = args.join(' ') || '✨ FLASH-MD Status Update!';
    let mediaBuffer;
    let mediaType = 'image';

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedType = quoted && getContentType(quoted);

      if (quoted) {
        if (quotedType === 'imageMessage' || quotedType === 'videoMessage') {
          const messageContent = {
            key: {
              remoteJid: fromJid,
              id: msg.message.extendedTextMessage.contextInfo.stanzaId,
              participant: msg.message.extendedTextMessage.contextInfo.participant
            },
            message: quoted
          };

          mediaBuffer = await downloadMediaMessage(
            messageContent,
            'buffer',
            {},
            { reuploadRequest: king.updateMediaMessage }
          );

          mediaType = quotedType === 'videoMessage' ? 'video' : 'image';
        } else {
          return king.sendMessage(fromJid, {
            text: '❌ Cannot post text-only replies as a status.\nPlease reply to an image or video, or provide a valid media URL.'
          }, { quoted: msg });
        }
      } else if (args[0]?.startsWith('http')) {
        const response = await axios.get(args[0], { responseType: 'arraybuffer' });
        mediaBuffer = Buffer.from(response.data, 'binary');
      } else {
        return king.sendMessage(fromJid, {
          text: '❗ Please reply to an image/video or provide a valid media URL.\n\nUsage:\n.status <caption> (reply to image/video)\n.status <url> <caption>'
        }, { quoted: msg });
      }

      const mediaPayload = {
        [mediaType]: mediaBuffer,
        caption
      };

      const chats = await king.chats.all();
      const userContacts = chats
        .map(chat => chat.id)
        .filter(jid => jid.endsWith('@s.whatsapp.net'));

      await king.sendMessage(fromJid, {
        text: `📤 Sending status to ${userContacts.length} contacts...`
      }, { quoted: msg });

      for (const jid of userContacts) {
        await king.sendMessage(jid, mediaPayload);
      }

    } catch (err) {
      console.error('[STATUS ERROR]', err);
      await king.sendMessage(fromJid, {
        text: '❌ Failed to send status. Please try again or check the media.'
      }, { quoted: msg });
    }
  }
};
