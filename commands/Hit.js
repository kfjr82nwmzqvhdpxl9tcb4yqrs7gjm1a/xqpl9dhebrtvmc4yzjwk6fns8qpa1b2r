module.exports = {
    name: 'github',
    aliases: ['repo', 'source'],
    description: 'Sends the GitHub repository link for the bot',
    execute: async (sock, msg) => {
        const chatId = msg.key.remoteJid;

        const repoInfo = `*🤖 KnightBot MD*

*📂 GitHub Repository:*
https://github.com/franceking1/Flash-Md-V2

*📢 Official Channel:*
https://youtube.com/@mr_unique_hacker

_Star ⭐ the repository if you like the bot!_`;

        try {
            await sock.sendMessage(chatId, {
                text: repoInfo,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363400829035253@newsletter',
                        newsletterName: 'KnightBot MD',
                        serverMessageId: -1
                    }
                }
            });
        } catch (error) {
            console.error('Error in github command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Error fetching repository information.'
            });
        }
    }
};
