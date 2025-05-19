require('dotenv').config();

module.exports = {
    prefix: '!',
    owners: ['254742063632'],
    AUTO_READ_MESSAGES: process.env.AUTO_READ, 
    sessionBase64: process.env.SESSION_BASE64 || ''
};
