const axios = require('axios');

module.exports = {
    name: 'npm',
    aliases: [],
    description: 'Search for an NPM package and view its details.',
    category: 'General',

    execute: async (sock, msg, args) => {
        const chatId = msg.key.remoteJid;

        if (!args || args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❗ Please provide an NPM package name to search for.'
            }, { quoted: msg });
        }

        const query = args.join(' ');
        const apiUrl = `https://weeb-api.vercel.app/npm?query=${encodeURIComponent(query)}`;

        try {
            const res = await axios.get(apiUrl);
            const data = res.data;

            if (!data.results?.length) {
                return await sock.sendMessage(chatId, {
                    text: `❌ No results found for "${query}".`
                }, { quoted: msg });
            }

            const pkg = data.results[0];
            const formattedDate = formatDate(pkg.date);

            const result = `*📦 NPM PACKAGE RESULT*

*📁 Name:* ${pkg.name}
*📌 Version:* ${pkg.version}
*📝 Description:* ${pkg.description}
*👤 Publisher:* ${pkg.publisher.username}
*⚖️ License:* ${pkg.license}
*📅 Last Updated:* ${formattedDate}

🔗 *NPM:* ${pkg.links.npm}
🔗 *Repository:* ${pkg.links.repository || 'N/A'}
🔗 *Homepage:* ${pkg.links.homepage || 'N/A'}

_Use this info to explore or install the package via terminal_`;

            await sock.sendMessage(chatId, {
                text: result,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363238139244263@newsletter',
                        newsletterName: 'FLASH-MD',
                        serverMessageId: -1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching NPM data:', error.message);
            await sock.sendMessage(chatId, {
                text: '❌ An error occurred while fetching the package info.'
            }, { quoted: msg });
        }
    }
};

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = ("0" + date.getDate()).slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    const hours = ("0" + (date.getHours() % 12 || 12)).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);
    const ampm = date.getHours() >= 12 ? 'pm' : 'am';
    return `${day}/${month}/${year} at ${hours}:${minutes} ${ampm}`;
}
