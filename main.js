const conf = require('./config');

function franceking() {
  return conf.MODE === 'private';
}

module.exports = { franceking }; 
