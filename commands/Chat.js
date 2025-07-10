const axios = require('axios');

const conversationHistory = {};
const MAX_HISTORY_LENGTH = 5;

module.exports = {
  name: 'ai',
  description: 'Chat with FLASH AI using conversation memory',
  category: 'Tools',
  aliases: ['resetai'],
  async execute(king, msg, args) {
    const fromJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const userId = senderJid;

    const text = args.join(' ').trim();
    const commandRaw = msg.body?.split(' ')[0]?.slice(1)?.toLowerCase();
    const usedPrefix = msg.body?.charAt(0) || '!';

    if (!text && commandRaw !== 'resetai') {
      return king.sendMessage(fromJid, {
        text: `💬 *FLASH AI* Chatbot\n\nPlease provide a message to chat.\n\nExample:\n*${usedPrefix}ai* How are you?\n\nCommands:\n- *${usedPrefix}ai <message>*\n- *${usedPrefix}resetai*`,
      }, { quoted: msg });
    }

    if (commandRaw === 'resetai') {
      delete conversationHistory[userId];
      return king.sendMessage(fromJid, {
        text: '🧠 FLASH AI conversation history reset!',
      }, { quoted: msg });
    }

    try {
      await king.sendPresenceUpdate('composing', fromJid);

      if (!conversationHistory[userId]) {
        conversationHistory[userId] = [];
      }

      const apiUrl = 'https://llm.gurucharan.me/v1/chat/completions';

      const messages = [
        {
          role: 'system',
          content: 'You are FLASH AI, a helpful assistant built into the FLASH-MD-V2 WhatsApp bot. Be concise, friendly, and helpful in your responses.'
        }
      ];

      conversationHistory[userId].forEach((exchange) => {
        messages.push({ role: 'user', content: exchange.user });
        messages.push({ role: 'assistant', content: exchange.assistant });
      });

      messages.push({ role: 'user', content: text });

      const payload = {
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      };

      const res = await axios.post(apiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const data = res.data;
      console.log('🔍 LLM API Raw Response:', JSON.stringify(data, null, 2));

      if (!data || !Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
        const debugInfo = JSON.stringify(data || {}, null, 2).slice(0, 500);
        throw new Error(`Invalid AI response. Debug: ${debugInfo}`);
      }

      const aiReply = data.choices[0].message.content.trim();

      conversationHistory[userId].push({
        user: text,
        assistant: aiReply
      });

      if (conversationHistory[userId].length > MAX_HISTORY_LENGTH) {
        conversationHistory[userId].shift();
      }

      const replyMessage = `┌──「 *FLASH AI CHAT* 」──┐\n\n${aiReply}\n\n└───────────────┘`;

      await king.sendMessage(fromJid, {
        text: replyMessage
      }, { quoted: msg });

    } catch (err) {
      console.error('FLASH AI Error:', err);
      return king.sendMessage(fromJid, {
        text: `❌ FLASH AI Error:\n${err.response?.data?.error?.message || err.message}`
      }, { quoted: msg });
    }
  }
};
