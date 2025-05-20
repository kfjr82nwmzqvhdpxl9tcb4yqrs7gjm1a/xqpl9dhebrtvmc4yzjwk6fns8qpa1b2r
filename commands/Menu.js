module.exports = {
    name: 'menu',
    aliases: ['help', 'commands'],
    description: 'Displays categorized list of commands',
    execute: async (king, msg, args, allCommands) => {
        const fromJid = msg.key.remoteJid;

        // Categorize commands
        const categorized = {};

        for (const cmd of allCommands) {
            const category = cmd.category ? cmd.category.toUpperCase() : 'GENERAL';
            if (!categorized[category]) categorized[category] = [];
            categorized[category].push(cmd);
        }

        let menuText = `*📜 FLASH-MD-V2 COMMAND MENU*\n\n`;

        for (const category in categorized) {
            menuText += `*🔖 ${category}*\n`;
            for (const cmd of categorized[category]) {
                const aliases = cmd.aliases?.length ? ` (Aliases: ${cmd.aliases.join(', ')})` : '';
                menuText += `• *${global.prefix}${cmd.name}*${aliases} - ${cmd.description}\n`;
            }
            menuText += '\n';
        }

        menuText += `_Use commands with the prefix: *${global.prefix}*_\nExample: *${global.prefix}ping*`;

        try {
            await king.sendMessage(fromJid, {
                text: menuText,
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
            console.error('Error in menu command:', error);
            await king.sendMessage(fromJid, {
                text: '❌ Error displaying the command menu.'
            });
        }
    }
};
