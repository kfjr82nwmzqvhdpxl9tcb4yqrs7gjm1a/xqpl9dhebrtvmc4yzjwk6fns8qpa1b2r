const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const P = require('pino')

const MAIN_LOGGER = P({ level: 'silent' })
const sessionFolder = './auth_info_baileys'

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)

    const sock = makeWASocket({
        version: await fetchLatestBaileysVersion().then(v => v.version),
        auth: state,
        printQRInTerminal: false,
        logger: MAIN_LOGGER,
        browser: ['Windows', 'Chrome', '10']
    })

    if (!sock.authState.creds.registered) {
        const phoneNumber = '254742063632'
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`Pairing code for ${phoneNumber}: ${code}`)
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error instanceof Boom &&
                    lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut)
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('Connected to WhatsApp')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0]
        if (!message.message || message.key.fromMe) return

        const sender = message.key.remoteJid
        const textMessage = message.message?.conversation ||
                            message.message?.extendedTextMessage?.text ||
                            ''

        if (textMessage.toLowerCase() === 'hi') {
            await sock.sendMessage(sender, { text: 'Hello! This is your Baileys bot.' })
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

connectToWhatsApp()
