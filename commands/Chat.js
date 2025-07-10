const axios = require('axios');

const conversationHistory = {};
const MAX_HISTORY_LENGTH = 5;

module.exports = {
  name: 'ai',
  description: 'Chat with FLASH AI using conversation memory',
  category: 'Tools',
  aliases: ['resetai'],
  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;
    const text = args.join(' ');
    const command = msg.body?.split(' ')[0]?.slice(1).toLowerCase();
    const userId = msg.key.participant || msg.key.remoteJid;

    if (!text && command !== 'resetai') {
      return king.sendMessage(fromJid, {
        text: `💬 *FLASH AI* Chatbot\n\nPlease provide a message to chat with FLASH AI.\n\nExample:\n*!ai* Hello, how are you?\n\nCommands:\n- *!ai <message>* - Chat with memory\n- *!resetai* - Reset your conversation history`
      }, { quoted: msg });
    }

    if (command === 'resetai') {
      delete conversationHistory[userId];
      return king.sendMessage(fromJid, {
        text: '✅ *FLASH AI* conversation history has been reset. Ready to start fresh!'
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

      conversationHistory[userId].forEach(exchange => {
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

      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from AI service');
      }

      const aiResponse = data.choices[0].message.content.trim();

      conversationHistory[userId].push({
        user: text,
        assistant: aiResponse
      });

      if (conversationHistory[userId].length > MAX_HISTORY_LENGTH) {
        conversationHistory[userId].shift();
      }

      const formatted = `┌──「 *FLASH AI CHAT* 」──┐\n\n${aiResponse}\n\n└───────────────┘`;

      await king.sendMessage(fromJid, {
        text: formatted
      }, { quoted: msg });

    } catch (error) {
      console.error('FLASH AI Error:', error);
      await king.sendMessage(fromJid, {
        text: `❎ *FLASH AI Error:* ${error.response?.data?.error?.message || error.message}`
      }, { quoted: msg });
    }
  }
};
