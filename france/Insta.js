const axios = require('axios');
const qs = require('qs');

async function getInstaMedia(url) {
  const payload = {
    sf_url: url,
    sf_submit: '',
    new: 2,
    lang: 'en',
    app: '',
    country: 'ke',
    os: 'Android',
    browser: 'Chrome',
    channel: 'downloader',
    'sf-nomad': 1,
    url: url,
    ts: Date.now(),
    _ts: Date.now() - 600000,
    _tsc: 0,
    _s: '5cfe24caca9b21e6c29e50fad53bbac4'
  };

  try {
    const res = await axios.post(
      'https://snapins.ai/action.php',
      qs.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://snapins.ai',
          'Referer': 'https://snapins.ai/',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36'
        }
      }
    );

    const result = res.data;

    if (result?.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
      return { igmp4: result.data[0].downloadUrl };
    }

    return { error: 'Failed to retrieve media. Try a different link.' };

  } catch (e) {
    return { error: 'Request error. Please try again later.' };
  }
}

module.exports = getInstaMedia;
