const conf = require('./config');

function isFlashOnly() {
  return conf.MODE === 'private';
}

module.exports = { franceking }; 
