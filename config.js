require('dotenv').config();

module.exports = {
    prefixes: process.env.PREFIX
        ? process.env.PREFIX.split(',').map(p => p.trim()) // allows "", "!", ".", etc.
        : [''], // fallback: no prefix allowed
    owners: ['254742063632', '254757835036'],
    MODE: process.env.MODE || 'private',
    AUTO_VIEW_STATUS: process.env.AUTO_READ_STATUS === 'on',
    AUTO_LIKE: process.env.AUTO_LIKE === 'on',
    AUTO_READ_MESSAGES: process.env.AUTO_READ_DM === 'on',
    sessionBase64: process.env.SESSION || ''
};
