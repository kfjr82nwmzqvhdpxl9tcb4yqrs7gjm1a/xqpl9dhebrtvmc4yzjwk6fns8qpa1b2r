const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

async function searchGenius(query) {
  const { data } = await axios.get('https://genius.com/api/search/multi', {
    params: { q: query },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
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
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');

  await page.goto(url, { waitUntil: 'networkidle2' });

  const title = await page.$eval('h1', el => el.innerText.trim());

  const lyrics = await page.$$eval('div[data-lyrics-container="true"]', elements =>
    elements.map(el => el.innerText.trim()).join('\n\n')
  );

  await browser.close();

  if (!lyrics) {
    throw new Error('Lyrics not found on the page.');
  }

  return {
    title,
    lyrics
  };
}

module.exports = { searchGenius, getLyrics };
