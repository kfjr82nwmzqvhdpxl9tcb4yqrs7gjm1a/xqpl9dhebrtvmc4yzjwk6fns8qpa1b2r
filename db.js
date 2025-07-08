const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'group_settings.json');
const WARNINGS_FILE = path.join(__dirname, 'user_warnings.json');

let groupSettings = {};
let userWarnings = {};

function loadData() {
  if (fs.existsSync(SETTINGS_FILE)) {
    groupSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  }
  if (fs.existsSync(WARNINGS_FILE)) {
    userWarnings = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf-8'));
  }
}

function saveData() {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(groupSettings, null, 2));
  fs.writeFileSync(WARNINGS_FILE, JSON.stringify(userWarnings, null, 2));
}

loadData();

module.exports = {
  getGroupSettings: async (groupId) => {
    return groupSettings[groupId] || null;
  },

  setGroupSettings: async (groupId, enabled, action) => {
    groupSettings[groupId] = {
      group_id: groupId,
      antilink_enabled: enabled ? 1 : 0,
      action: action || 'kick',
    };
    saveData();
  },

  incrementWarning: async (groupId, userId) => {
    const key = `${groupId}:${userId}`;
    if (!userWarnings[key]) {
      userWarnings[key] = 1;
    } else {
      userWarnings[key]++;
    }
    saveData();
  },

  getWarnings: async (groupId, userId) => {
    const key = `${groupId}:${userId}`;
    return userWarnings[key] || 0;
  }
};
