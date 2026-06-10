const clients = new Map();

function addClient(userId, ws) {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(ws);
  ws.on('close', () => {
    clients.get(key)?.delete(ws);
    if (clients.get(key)?.size === 0) clients.delete(key);
  });
}

function sendToUser(userId, payload) {
  const sockets = clients.get(String(userId));
  if (!sockets) return;
  const message = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(message);
  }
}

module.exports = { addClient, sendToUser };
