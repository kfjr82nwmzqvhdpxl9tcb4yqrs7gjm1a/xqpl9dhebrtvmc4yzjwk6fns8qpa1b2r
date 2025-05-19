require('dotenv').config();
const fs = require('fs');
const { useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { sessionBase64 } = require('./config');

const SESSION_FILE = './session.json';

function loadSessionFromBase64() {
    const base64 = process.env.SESSION_BASE64 || sessionBase64;
    if (base64) {
        try {
            const json = Buffer.from(base64, 'base64').toString('utf-8');
            fs.writeFileSync(SESSION_FILE, json, 'utf-8');
        } catch (err) {
            console.error('Invalid Base64 session:', err);
        }
    }
    return useSingleFileAuthState(SESSION_FILE);
}

function getEncodedSession() {
    if (!fs.existsSync(SESSION_FILE)) return '';
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    return Buffer.from(raw).toString('base64');
}

module.exports = { loadSessionFromBase64, getEncodedSession };
