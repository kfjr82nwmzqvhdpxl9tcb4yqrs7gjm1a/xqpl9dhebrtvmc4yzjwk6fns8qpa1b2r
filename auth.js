require('dotenv').config();
const fs = require('fs');
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { sessionBase64 } = require('./config');

const SESSION_FOLDER = './auth_state';

async function loadSessionFromBase64() {
    const base64 = process.env.SESSION || sessionBase64;
    if (base64) {
        if (!base64.startsWith('FLASH-MD-V2')) {
            console.error('Invalid session prefix, session must start with FLASH-MD-V2');
            process.exit(1);
        }
        try {
            const strippedBase64 = base64.replace(/^FLASH-MD-V2/, '');
            const json = Buffer.from(strippedBase64, 'base64').toString('utf-8');
            if (!fs.existsSync(SESSION_FOLDER)) fs.mkdirSync(SESSION_FOLDER);
            fs.writeFileSync(`${SESSION_FOLDER}/creds.json`, json, 'utf-8');
        } catch (err) {
            console.error('Invalid Base64 session:', err);
            process.exit(1);
        }
    } else {
        console.error('No session provided in environment variable SESSION or config');
        process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
    return { state, saveState: saveCreds };
}

function getEncodedSession() {
    const filePath = `${SESSION_FOLDER}/creds.json`;
    if (!fs.existsSync(filePath)) return '';
    const raw = fs.readFileSync(filePath, 'utf-8');
    return `FLASH-MD-V2${Buffer.from(raw).toString('base64')}`;
}

module.exports = { loadSessionFromBase64, getEncodedSession };
