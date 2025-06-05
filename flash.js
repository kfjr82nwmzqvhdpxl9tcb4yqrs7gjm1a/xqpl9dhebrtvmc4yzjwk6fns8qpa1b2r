const cron = require('node-cron');
const axios = require('axios');

const url = process.env.ALIVE_URL || 'https://new-bot-5l2f.onrender.com';

cron.schedule('*/14 * * * *', () => {
    axios.get(url)
        .then(response => {
            if (response.status === 200) {
                console.log(`[FLASH-MD KEEP-ALIVE] Service pinged successfully at ${new Date().toLocaleString()}`);
            } else {
                console.error(`[FLASH-MD KEEP-ALIVE] Unexpected status code: ${response.status}`);
            }
        })
        .catch(error => {
            console.error('[FLASH-MD KEEP-ALIVE] Ping failed:', error.message);
        });
});
