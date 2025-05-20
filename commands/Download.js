const axios = require('axios');

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

module.exports = [
    {
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
                await sock.sendMessage(chatId, {
                    text: '❌ An error occurred while fetching the package info.'
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'apk',
        aliases: ['app', 'application'],
        description: 'Search and download Android APK files.',
        category: 'Download',
        execute: async (sock, msg, args) => {
            const chatId = msg.key.remoteJid;

            if (!args || !args.length) {
                return await sock.sendMessage(chatId, {
                    text: '❗ Please provide an app name to search for.'
                }, { quoted: msg });
            }

            const query = args.join(' ');

            try {
                await sock.sendMessage(chatId, {
                    text: '🔍 Searching for the APK, please wait...'
                }, { quoted: msg });

                const searchRes = await axios.get(`https://bk9.fun/search/apk?q=${encodeURIComponent(query)}`);
                const results = searchRes.data?.BK9;

                if (!results || results.length === 0) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No APKs found for "${query}".`
                    }, { quoted: msg });
                }

                const apk = results[0];
                const downloadRes = await axios.get(`https://bk9.fun/download/apk?id=${apk.id}`);
                const downloadLink = downloadRes.data?.BK9?.dllink;

                if (!downloadLink) {
                    return await sock.sendMessage(chatId, {
                        text: '❌ Failed to retrieve the download link.'
                    }, { quoted: msg });
                }

                await sock.sendMessage(chatId, {
                    document: { url: downloadLink },
                    mimetype: 'application/vnd.android.package-archive',
                    fileName: `${apk.name}.apk`,
                    caption: `*📥 APK DOWNLOADER*

*📌 App:* ${apk.name}
*📎 Type:* APK File
*⚙️ Powered by:* FLASH-MD`
                }, { quoted: msg });

                await sock.sendMessage(chatId, {
                    text: `✅ Successfully fetched and sent APK for *${apk.name}*.

_Enjoy using the app. Powered by FLASH-MD_`,
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
                await sock.sendMessage(chatId, {
                    text: '❌ An error occurred while processing your APK request.'
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'fetch',
        aliases: [],
        description: 'Fetches content from a URL and responds with the appropriate media or text.',
        category: 'Search',
        execute: async (sock, msg, args) => {
            const chatId = msg.key.remoteJid;
            const url = args.join(' ');

            if (!/^https?:\/\//.test(url)) {
                return await sock.sendMessage(chatId, {
                    text: '❗ Please start the URL with *http://* or *https://*'
                }, { quoted: msg });
            }

            try {
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    maxContentLength: 100 * 1024 * 1024,
                    validateStatus: () => true
                });

                const contentType = response.headers['content-type'] || '';
                const contentLength = parseInt(response.headers['content-length'] || '0');

                if (response.status >= 400) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ Failed to fetch the URL. Status: ${response.status}`
                    }, { quoted: msg });
                }

                if (contentLength > 100 * 1024 * 1024) {
                    return await sock.sendMessage(chatId, {
                        text: '⚠️ The content is too large to process (over 100MB).'
                    }, { quoted: msg });
                }

                const meta = {
                    quoted: msg,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363238139244263@newsletter',
                            newsletterName: 'FLASH-MD',
                            serverMessageId: -1
                        }
                    }
                };

                const buffer = Buffer.from(response.data);

                if (/image\//.test(contentType)) {
                    return await sock.sendMessage(chatId, {
                        image: buffer,
                        caption: '> > *POWERED BY FLASH-MD*'
                    }, meta);
                }

                if (/video\//.test(contentType)) {
                    return await sock.sendMessage(chatId, {
                        video: buffer,
                        caption: '> > *POWERED BY FLASH-MD*'
                    }, meta);
                }

                if (/audio\//.test(contentType)) {
                    return await sock.sendMessage(chatId, {
                        audio: buffer,
                        caption: '> > *POWERED BY FLASH-MD*'
                    }, meta);
                }

                if (/json|text\//.test(contentType)) {
                    let textContent = buffer.toString();
                    try {
                        const parsed = JSON.parse(textContent);
                        textContent = JSON.stringify(parsed, null, 2);
                    } catch {}
                    return await sock.sendMessage(chatId, {
                        text: `*FETCHED CONTENT*\n\n${textContent.slice(0, 65536)}`
                    }, meta);
                }

                return await sock.sendMessage(chatId, {
                    document: buffer,
                    mimetype: contentType,
                    fileName: 'fetched_content',
                    caption: '> > *POWERED BY FLASH-MD*'
                }, meta);
            } catch (err) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Error fetching content: ${err.message}`
                }, { quoted: msg });
            }
        }
    }
];
