require('dotenv').config();

module.exports = {
    prefix: '',
    owners: ['254742063632'],
    MODE: 'private', 
    AUTO_VIEW_STATUS: process.env.AUTO_READ_STATUS === 'on',
    AUTO_LIKE: process.env.AUTO_LIKE === 'on',
    AUTO_READ_MESSAGES: process.env.AUTO_READ_DM === 'on',
    sessionBase64: process.env.SESSION || ''
};
