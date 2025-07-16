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

    // Replace with your real list or fetch dynamically
    const statusJidList = [
      '1234567890@c.us',
      '1122334455@c.us'
    ];

    const caption = args.join(' ') || '✨ FLASH-MD Status Update!';
    let mediaBuffer;
    let mediaType = 'image'; // default

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedType = quoted && getContentType(quoted);

      // If replying to image or video
      if (quoted && (quotedType === 'imageMessage' || quotedType === 'videoMessage')) {
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

      } else if (args[0]?.startsWith('http')) {
        // If user gives a URL
        const response = await axios.get(args[0], { responseType: 'arraybuffer' });
        mediaBuffer = Buffer.from(response.data, 'binary');
      } else {
        return king.sendMessage(fromJid, {
          text: '❗ Please *reply* to an image/video or provide a *valid media URL*.\n\nUsage:\n.status <caption> (reply to image/video)\n.status <url> <caption>'
        }, { quoted: msg });
      }

      const mediaPayload = {
        [mediaType]: mediaBuffer,
        caption
      };

      // Notify sending
      await king.sendMessage(
        fromJid,
        { text: `📤 Sending status to ${statusJidList.length} contacts...` },
        { quoted: msg }
      );

      // Send to status
      await king.sendMessage(
        fromJid,
        mediaPayload,
        {
          broadcast: true,
          statusJidList,
          backgroundColor: '#075e54',
          font: 1
        }
      );

    } catch (err) {
      console.error('[STATUS ERROR]', err);
      await king.sendMessage(fromJid, {
        text: '❌ Failed to send status. Please try again or check the media.'
      }, { quoted: msg });
    }
  }
};
