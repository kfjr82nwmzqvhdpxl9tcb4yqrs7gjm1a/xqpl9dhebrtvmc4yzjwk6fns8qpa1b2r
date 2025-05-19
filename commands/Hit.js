module.exports = {
    name: 'repo',
    aliases: ['sc', 'script'],
    description: 'Sends the GitHub repository link for the bot',
    execute: async (sock, msg) => {
        const chatId = msg.key.remoteJid;

        const repoInfo = `*🤖 KnightBot MD*

*📂 GitHub Repository:*
https://github.com/franceking1/Flash-Md-V2

_Star ⭐ the repository if you like the bot!_`;

        try {
            await sock.sendMessage(chatId, {
                text: repoInfo,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363400829035253@newsletter',
                        newsletterName: 'FLASH-MD',
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
