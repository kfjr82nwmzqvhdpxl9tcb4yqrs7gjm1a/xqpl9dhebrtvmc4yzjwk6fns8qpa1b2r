require('dotenv').config();
const fs = require('fs');
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { sessionBase64 } = require('./config');

const SESSION_FOLDER = './auth_state';

async function loadSessionFromBase64() {
    const base64 = process.env.SESSION_BASE64 || sessionBase64;

    if (!base64 || base64.trim() === '') {
        console.error('❌ No session base64 string found.');
        throw new Error('Session base64 string missing.');
    }

    let decodedString;
    try {
        decodedString = Buffer.from(base64, 'base64').toString('utf-8');
    } catch (err) {
        console.error('❌ Failed to decode base64 session string.');
        throw new Error('Invalid base64 session string.');
    }

    if (!decodedString.startsWith('FLASH-MD-V2')) {
        console.error('❌ Session does not start with required prefix "FLASH-MD-V2".');
        throw new Error('Session prefix invalid or missing.');
    }

    const jsonString = decodedString.slice('FLASH-MD-V2'.length);

    let sessionJson;
    try {
        sessionJson = JSON.parse(jsonString);
    } catch (err) {
        console.error('❌ Failed to parse session JSON after prefix.');
        throw new Error('Session JSON invalid.');
    }

    if (!fs.existsSync(SESSION_FOLDER)) fs.mkdirSync(SESSION_FOLDER);
    fs.writeFileSync(`${SESSION_FOLDER}/creds.json`, JSON.stringify(sessionJson, null, 2), 'utf-8');

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
    return { state, saveState: saveCreds };
}

function getEncodedSession() {
    const filePath = `${SESSION_FOLDER}/creds.json`;
    if (!fs.existsSync(filePath)) return '';
    const raw = fs.readFileSync(filePath, 'utf-8');
    return Buffer.from('FLASH-MD-V2' + raw).toString('base64');
}

module.exports = { loadSessionFromBase64, getEncodedSession };

