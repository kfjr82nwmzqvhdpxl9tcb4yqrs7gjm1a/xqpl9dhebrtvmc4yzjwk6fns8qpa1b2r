// utils/helpers.js
function normalizeJid(jid) {
  return jid.replace(/@lid$/, '@s.whatsapp.net');
}

function getUserNumber(jid) {
  const cleanJid = normalizeJid(jid);
  return cleanJid.split('@')[0];
}

function isGroupJid(jid) {
  return jid.endsWith('@g.us') || jid.endsWith('@lid');
}

module.exports = {
  normalizeJid,
  getUserNumber,
  isGroupJid
};
