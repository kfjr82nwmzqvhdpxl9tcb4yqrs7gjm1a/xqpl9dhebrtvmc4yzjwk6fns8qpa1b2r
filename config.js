require('dotenv').config();

function mapPresence(val) {
    switch ((val || '').toLowerCase()) {
        case 'typing': return 'composing';
        case 'online': return 'available';
        case 'recording': return 'recording';
        case 'paused': return 'paused';
        case '': return null;
        default: return null;
    }
}

module.exports = {
    prefixes: process.env.PREFIX
        ? process.env.PREFIX.split(',').map(p => p.trim())
        : [''],
    owners: ['254742063632', '254757835036'],
    MODE: process.env.MODE || 'private',
    ANTICALL: process.env.ANTICALL || 'on',
    AUTO_VIEW_STATUS: process.env.AUTO_READ_STATUS === 'on',
    AUTO_LIKE: process.env.AUTO_LIKE === 'on',
    AUTO_READ_MESSAGES: process.env.AUTO_READ_DM === 'on',
    sessionBase64: process.env.SESSION || '',
    timezone: 'Africa/Nairobi',
    PRESENCE: {
        DM: mapPresence(process.env.PRESENCE_DM),
        GROUP: mapPresence(process.env.PRESENCE_GROUP)
    }
};
