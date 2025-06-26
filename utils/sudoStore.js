// utils/sudoStore.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/sudo.json');

// Ensure the directory and file exist
function ensureFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
}

// Load allowed users
function loadSudoList() {
  ensureFile();
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

// Save allowed users
function saveSudoList(set) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify([...set]));
}

module.exports = {
  loadSudoList,
  saveSudoList
};
