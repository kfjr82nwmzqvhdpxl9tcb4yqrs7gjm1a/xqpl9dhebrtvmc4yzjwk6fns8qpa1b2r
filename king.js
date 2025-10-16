const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const P = require('pino')

const MAIN_LOGGER = P({ level: 'silent' })

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: MAIN_LOGGER,
        printQRInTerminal: false,
        browser: ['Baileys', 'Chrome', '1.0']
    })

    if (!sock.authState.creds.registered) {
        const number = '254742063632'
        const code = await sock.requestPairingCode(number)
        console.log(`Pairing code for ${number}: ${code}`)
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
            const shouldReconnect = !(
                lastDisconnect?.error instanceof Boom &&
                lastDisconnect.error.output?.statusCode === DisconnectReason.loggedOut
            )

            if (shouldReconnect) {
                startSock()
            }
        }

        if (connection === 'open') {
            console.log('✅ Connected to WhatsApp Web')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0]
        if (!message.message || message.key.fromMe) return

        const sender = message.key.remoteJid
        const text = message.message?.conversation || ''

        if (text.toLowerCase() === 'hi') {
            await sock.sendMessage(sender, { text: '👋 Hello! Bot is active.' })
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startSock()
