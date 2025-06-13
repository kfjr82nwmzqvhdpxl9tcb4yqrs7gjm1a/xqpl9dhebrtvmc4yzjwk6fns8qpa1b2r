const { franceking } = require('../main');
const axios = require('axios');

const { HEROKU_API_KEY, HEROKU_APP_NAME } = process.env;

module.exports = [
  {
    name: 'update',
    get flashOnly() {
      return franceking();
    },
    description: 'Check for new GitHub commits and trigger Heroku redeploy.',
    category: 'HEROKU',
    ownerOnly: true,

    execute: async (king, msg, args) => {
      const fromJid = msg.key.remoteJid;

      if (!HEROKU_API_KEY || !HEROKU_APP_NAME) {
        return king.sendMessage(fromJid, {
          text: '⚠️ HEROKU_API_KEY or HEROKU_APP_NAME is not set in environment.'
        }, { quoted: msg });
      }

      try {
        const githubRes = await axios.get(
          'https://api.github.com/repos/franceking1/Flash-Md-V2/commits/main'
        );
        const latestCommit = githubRes.data;
        const latestSha = latestCommit.sha;

        const herokuRes = await axios.get(
          `https://api.heroku.com/apps/${HEROKU_APP_NAME}/builds`,
          {
            headers: {
              Authorization: `Bearer ${HEROKU_API_KEY}`,
              Accept: 'application/vnd.heroku+json; version=3'
            }
          }
        );

        const lastBuild = herokuRes.data[0];
        const deployedSha = lastBuild?.source_blob?.url || '';
        const alreadyDeployed = deployedSha.includes(latestSha);

        if (alreadyDeployed) {
          return king.sendMessage(fromJid, {
            text: '✅ Bot is already up to date with the latest commit.'
          }, { quoted: msg });
        }

        await king.sendMessage(fromJid, {
          text: `🆕 *New commit found!*\n\n*📄 Message:* ${latestCommit.commit.message}\n*👤 Author:* ${latestCommit.commit.author.name}\n\nReply with *yes* within 30 seconds to update.`
        }, { quoted: msg });

        let reply;
        try {
          reply = await king.awaitForMessage({
            chatJid: fromJid,
            sender: msg.key.participant || msg.key.remoteJid,
            timeout: 30000,
            filter: m => {
              const text = m.message?.conversation || m.message?.extendedTextMessage?.text;
              return text?.toLowerCase() === 'yes';
            }
          });
        } catch (err) {
          return king.sendMessage(fromJid, {
            text: '⏰ No confirmation received. Update cancelled.'
          }, { quoted: msg });
        }

        await axios.post(
          `https://api.heroku.com/apps/${HEROKU_APP_NAME}/builds`,
          {
            source_blob: {
              url: 'https://github.com/franceking1/Flash-Md-V2/tarball/main'
            }
          },
          {
            headers: {
              Authorization: `Bearer ${HEROKU_API_KEY}`,
              Accept: 'application/vnd.heroku+json; version=3',
              'Content-Type': 'application/json'
            }
          }
        );

        await king.sendMessage(fromJid, {
          text: '🚀 Heroku redeploy triggered. Wait 1–2 minutes for bot update.'
        }, { quoted: msg });

      } catch (error) {
        const errMsg = error.response?.data?.message || error.message;
        console.error('Update failed:', errMsg);
        await king.sendMessage(fromJid, {
          text: `❌ Error: ${errMsg}`
        }, { quoted: msg });
      }
    }
  }
];
