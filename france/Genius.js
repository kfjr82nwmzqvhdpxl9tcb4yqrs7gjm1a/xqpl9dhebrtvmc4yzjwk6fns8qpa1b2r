const axios = require('axios');
const cheerio = require('cheerio');

async function searchGenius(query) {
  const { data } = await axios.get('https://genius.com/api/search/multi', {
    params: { q: query },
    headers: { 'User-Agent': 'Mozilla/5.0' }
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
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
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
