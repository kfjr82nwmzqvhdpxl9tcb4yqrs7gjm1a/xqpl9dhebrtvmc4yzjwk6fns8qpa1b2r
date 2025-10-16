const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const P = require('pino')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Baileys', 'Chrome', '1.0']
    })

    if (!sock.authState.creds.registered) {
        const number = '254742063632'
        const code = await sock.requestPairingCode(number)
        console.log(`📱 Pairing code for ${number}: ${code}`)
    }

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection } = update
        if (connection === 'open') {
            console.log('✅ Connected successfully.')
        }
    })
}

startBot()
