const axios = require('axios');

function keepAlive() {
    setInterval(() => {
        axios.get('https://new-6tot.onrender.com')
            .then(() => console.log('Session Generator Pinged'))
            .catch(err => console.error('Keep-alive failed:', err));
    }, 1000 * 60 * 4);
}

keepAlive();
