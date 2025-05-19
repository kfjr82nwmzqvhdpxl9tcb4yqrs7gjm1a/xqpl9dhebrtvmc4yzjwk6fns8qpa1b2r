require('dotenv').config();
const fs = require('fs');
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { sessionBase64 } = require('./config');

const SESSION_FOLDER = './auth_state';

async function loadSessionFromBase64() {
    const base64 = process.env.SESSION_BASE64 || sessionBase64;
    if (base64) {
        try {
            const json = Buffer.from(base64, 'base64').toString('utf-8');
            if (!fs.existsSync(SESSION_FOLDER)) fs.mkdirSync(SESSION_FOLDER);
            fs.writeFileSync(`${SESSION_FOLDER}/creds.json`, json, 'utf-8');
        } catch (err) {
            console.error('Invalid Base64 session:', err);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
    return { state, saveState: saveCreds };
}

function getEncodedSession() {
    const filePath = `${SESSION_FOLDER}/creds.json`;
    if (!fs.existsSync(filePath)) return '';
    const raw = fs.readFileSync(filePath, 'utf-8');
    return Buffer.from(raw).toString('base64');
}

module.exports = { loadSessionFromBase64, getEncodedSession };
