const fs = require('fs');
const path = require('path');
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const config = require('./config');

const AUTH_DIR = './auth_info';
const base64 = process.env.SESSION_BASE64 || config.sessionBase64;

async function loadSessionFromBase64() {
    const credsPath = path.join(AUTH_DIR, 'creds.json');

    if (base64 && !fs.existsSync(credsPath)) {
        try {
            const decoded = Buffer.from(base64, 'base64').toString('utf-8');
            fs.mkdirSync(AUTH_DIR, { recursive: true });
            fs.writeFileSync(credsPath, decoded, 'utf-8');
            console.log('✅ Session restored from Base64');
        } catch (err) {
            console.error('❌ Failed to decode Base64 session:', err);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    return { state, saveCreds };
}

function getEncodedSession() {
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) return '';
    const raw = fs.readFileSync(credsPath, 'utf-8');
    return Buffer.from(raw).toString('base64');
}

module.exports = { loadSessionFromBase64, getEncodedSession };
