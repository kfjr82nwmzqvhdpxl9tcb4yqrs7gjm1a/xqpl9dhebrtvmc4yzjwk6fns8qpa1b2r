const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function enhanceImage(imageBuffer) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('https://waifu2x.udp.jp/index.en.html', { waitUntil: 'networkidle2' });

  // Save the buffer temporarily to upload
  const tempImagePath = path.join(__dirname, 'temp_upload.jpg');
  await fs.promises.writeFile(tempImagePath, imageBuffer);

  // Upload file
  const inputUploadHandle = await page.$('input[type=file]');
  await inputUploadHandle.uploadFile(tempImagePath);

  // Set noise reduction to 'None' (optional)
  await page.select('#noise_level', '0');
  // Set scale to 2x (default)
  await page.select('#scale', '2');

  // Click convert
  await page.click('input[type=submit]');

  // Wait for result image to appear (max 60 seconds)
  await page.waitForSelector('#result > img', { timeout: 60000 });

  // Get the URL of the enhanced image
  const enhancedImageUrl = await page.$eval('#result > img', img => img.src);

  // Download enhanced image
  const viewSource = await page.goto(enhancedImageUrl);
  const enhancedBuffer = await viewSource.buffer();

  await browser.close();
  await fs.promises.unlink(tempImagePath);

  return enhancedBuffer;
}

module.exports = { enhanceImage };
