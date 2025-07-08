const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'group_settings.json');
const WARNINGS_FILE = path.join(__dirname, 'user_warnings.json');

let groupSettings = {};
let userWarnings = {};

function loadData() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      groupSettings = JSON.parse(data || '{}');
      console.log('[DB] Group settings loaded.');
    } else {
      console.log('[DB] No settings file found, starting fresh.');
    }
  } catch (err) {
    console.error('[DB] Error loading group settings:', err);
  }

  try {
    if (fs.existsSync(WARNINGS_FILE)) {
      const data = fs.readFileSync(WARNINGS_FILE, 'utf-8');
      userWarnings = JSON.parse(data || '{}');
      console.log('[DB] User warnings loaded.');
    } else {
      console.log('[DB] No warnings file found, starting fresh.');
    }
  } catch (err) {
    console.error('[DB] Error loading user warnings:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(groupSettings, null, 2));
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(userWarnings, null, 2));
    console.log('[DB] Data saved.');
  } catch (err) {
    console.error('[DB] Error saving data:', err);
  }
}

loadData(); // Load when the module is first required

module.exports = {
  getGroupSettings: async (groupId) => {
    return groupSettings[groupId] || null;
  },

  setGroupSettings: async (groupId, enabled, action = 'kick') => {
    groupSettings[groupId] = {
      group_id: groupId,
      antilink_enabled: enabled ? 1 : 0,
      action: action,
    };
    saveData();
  },

  incrementWarning: async (groupId, userId) => {
    const key = `${groupId}:${userId}`;
    userWarnings[key] = (userWarnings[key] || 0) + 1;
    saveData();
  },

  getWarnings: async (groupId, userId) => {
    const key = `${groupId}:${userId}`;
    return userWarnings[key] || 0;
  },

  resetWarnings: async (groupId, userId) => {
    const key = `${groupId}:${userId}`;
    delete userWarnings[key];
    saveData();
  }
};
