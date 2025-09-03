async function getOnlineMembers(king, groupJid) {
  const metadata = await king.groupMetadata(groupJid);
  const participants = metadata.participants;

  const onlineUsers = new Set();

  king.ev.on('presence.update', ({ id, presences }) => {
    Object.entries(presences).forEach(([userJid, presenceInfo]) => {
      if (presenceInfo.lastKnownPresence === 'available') {
        onlineUsers.add(userJid);
      } else if (presenceInfo.lastKnownPresence === 'unavailable') {
        onlineUsers.delete(userJid);
      }
    });
  });

  for (const participant of participants) {
    await king.presenceSubscribe(participant.id);
    await new Promise(res => setTimeout(res, 300));
  }

  await new Promise(res => setTimeout(res, 3000));

  return Array.from(onlineUsers);
}

module.exports = { getOnlineMembers }; 
