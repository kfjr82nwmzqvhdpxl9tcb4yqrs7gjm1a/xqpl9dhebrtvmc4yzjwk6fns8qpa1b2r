const translatte = require('translatte');

async function translateText(text, options) {
  try {
    const result = await translatte(text, options);
    return result.text;
  } catch (error) {
    throw error;
  }
}

module.exports = translateText;
