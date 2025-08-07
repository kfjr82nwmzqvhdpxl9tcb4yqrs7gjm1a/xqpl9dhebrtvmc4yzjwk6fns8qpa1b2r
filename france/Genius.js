const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

async function searchGenius(query) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');

  const searchUrl = `https://genius.com/search?q=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  const url = await page.$$eval('a[href*="/lyrics"]', links => {
    const first = links.find(link => link.href.includes('-lyrics'));
    return first ? first.href : null;
  });

  await browser.close();

  if (!url) throw new Error('No song found.');

  return url;
}

async function getLyrics(url) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');

  await page.goto(url, { waitUntil: 'networkidle2' });

  const title = await page.$eval('h1', el => el.innerText.trim());

  const lyrics = await page.$$eval('div[data-lyrics-container="true"]', els =>
    els.map(el => el.innerText.trim()).join('\n\n')
  );

  await browser.close();

  if (!lyrics) throw new Error('Lyrics not found on the page.');

  return {
    title,
    lyrics
  };
}

module.exports = { searchGenius, getLyrics };
