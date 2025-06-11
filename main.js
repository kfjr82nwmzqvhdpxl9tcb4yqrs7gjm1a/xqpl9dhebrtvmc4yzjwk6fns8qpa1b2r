const conf = require('./config');

function franceking() {
  const isPrivate = conf.MODE === 'private';
  console.log('Current MODE:', conf.MODE, 'franceking() returns:', isPrivate);
  return isPrivate;
}

module.exports = { franceking };
