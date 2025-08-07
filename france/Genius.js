// france/genius.js
const axios = require('axios');
const cheerio = require('cheerio');

const GENIUS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://genius.com/',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

async function searchGenius(query) {
  const { data } = await axios.get('https://genius.com/api/search/multi', {
    params: { q: query },
    headers: {
      ...GENIUS_HEADERS,
      'Accept': 'application/json, text/plain, */*'
    }
  });

  const sections = data.response?.sections || [];
  const songSection = sections.find(sec => sec.type === 'song');

  const hit = songSection?.hits?.[0];
  const url = hit?.result?.url;

  if (!url) {
    throw new Error('No song found.');
  }

  return url;
}

async function getLyrics(url) {
  const { data } = await axios.get(url, {
    headers: GENIUS_HEADERS
  });

  const $ = cheerio.load(data);

  const title = $('h1').first().text().trim();

  const lyrics = $('div[data-lyrics-container="true"]')
    .map((i, el) => $(el).text().trim())
    .get()
    .join('\n\n');

  if (!lyrics) {
    throw new Error('Lyrics not found on the page.');
  }

  return {
    title,
    lyrics
  };
}

module.exports = { searchGenius, getLyrics };
