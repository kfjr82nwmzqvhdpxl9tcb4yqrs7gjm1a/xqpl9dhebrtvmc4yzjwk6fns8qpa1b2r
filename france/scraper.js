// france/scraper.js
const axios = require('axios');
const FormData = require('form-data');

async function enhanceImage(imageBuffer) {
  const form = new FormData();
  form.append('image', imageBuffer, {
    filename: 'image.jpg',
    contentType: 'image/jpeg'
  });

  const response = await axios.post('https://api.upscale.media/api/v1/upscale', form, {
    headers: {
      ...form.getHeaders()
    }
  });

  const { success, output_url } = response.data;

  if (!success || !output_url) {
    throw new Error('Failed to enhance image using Upscale.media');
  }

  const enhancedImage = await axios.get(output_url, { responseType: 'arraybuffer' });
  return Buffer.from(enhancedImage.data, 'binary');
}

module.exports = { enhanceImage };
