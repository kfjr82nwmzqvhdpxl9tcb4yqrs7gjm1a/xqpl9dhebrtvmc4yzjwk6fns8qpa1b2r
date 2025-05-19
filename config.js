require('dotenv').config();

module.exports = {
    prefix: '', // Can be '', or any other single prefix
    owners: ['254742063632'],
    AUTO_READ_MESSAGES: process.env.AUTO_READ_DM || 'off',
    sessionBase64: process.env.SESSION_BASE64 || ''
};
