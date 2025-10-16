const fs = require('fs');
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');

const SESSION_FILE = './auth_state.json';
const base64 = process.env.SESSION_BASE64 || require('./config').sessionBase64;

async function loadSessionFromBase64() {
    if (base64 && !fs.existsSync(SESSION_FILE)) {
        try {
            const decoded = Buffer.from(base64, 'base64').toString('utf-8');
            fs.writeFileSync(SESSION_FILE, decoded, 'utf-8');
            console.log('✅ Session restored from Base64');
        } catch (err) {
            console.error('❌ Failed to decode Base64 session:', err);
        }
    }

    const { state, saveState } = await useSingleFileAuthState(SESSION_FILE);
    return { state, saveState };
}

function getEncodedSession() {
    if (!fs.existsSync(SESSION_FILE)) return '';
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    return Buffer.from(raw).toString('base64');
}

module.exports = { loadSessionFromBase64, getEncodedSession };
