import assert from 'node:assert/strict';
import {
  createIdentity,
  getPublicIdentity,
  calculateFingerprint,
  encryptMessage,
  decryptMessage
} from '../src/utils/e2ee.js';

const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:3101').replace(/\/$/, '');
const adminUsername = process.env.E2E_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const peerUsername = process.env.E2E_PEER_USERNAME || 'master';
const peerPassword = process.env.E2E_PEER_PASSWORD;

if (!adminPassword || !peerPassword) {
  throw new Error('请通过 E2E_ADMIN_PASSWORD 和 E2E_PEER_PASSWORD 提供测试账号密码');
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${payload.error || '请求失败'}`);
  }
  return payload;
}

async function login(identifier, password) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

async function uploadIdentity(token, identity) {
  const publicIdentity = getPublicIdentity(identity);
  const [exchangeFingerprint, signingFingerprint] = await Promise.all([
    calculateFingerprint(publicIdentity.exchangePublicKey),
    calculateFingerprint(publicIdentity.signingPublicKey)
  ]);
  await request('/api/crypto/keys', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      ...publicIdentity,
      exchangeFingerprint,
      signingFingerprint
    })
  });
}

const [adminLogin, peerLogin] = await Promise.all([
  login(adminUsername, adminPassword),
  login(peerUsername, peerPassword)
]);

const conversationResponse = await request('/api/conversations', {
  method: 'POST',
  headers: authHeaders(adminLogin.token),
  body: JSON.stringify({ targetUserId: peerLogin.user.id })
});
const conversationId = conversationResponse.conversation.id;

const [adminIdentity, peerIdentity] = await Promise.all([
  createIdentity(adminLogin.user.id),
  createIdentity(peerLogin.user.id)
]);
await Promise.all([
  uploadIdentity(adminLogin.token, adminIdentity),
  uploadIdentity(peerLogin.token, peerIdentity)
]);

const cryptoResponse = await request(`/api/crypto/conversations/${conversationId}`, {
  headers: authHeaders(adminLogin.token)
});
const peerKeyRecord = cryptoResponse.keys.find(key => key.user_id === peerLogin.user.id);
assert.ok(peerKeyRecord, '服务器应返回对方公钥');

const plaintext = '端到端加密 API 集成测试';
const encrypted = await encryptMessage({
  conversationId,
  senderId: adminLogin.user.id,
  plaintext,
  identity: adminIdentity,
  peerKey: {
    exchangePublicKey: peerKeyRecord.exchange_public_key,
    signingPublicKey: peerKeyRecord.signing_public_key
  }
});

const sentMessage = await request(`/api/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: authHeaders(adminLogin.token),
  body: JSON.stringify({ content: encrypted })
});
assert.equal(sentMessage.message.encryption_mode, 'e2ee');

const peerCryptoResponse = await request(`/api/crypto/conversations/${conversationId}`, {
  headers: authHeaders(peerLogin.token)
});
const adminKeyRecord = peerCryptoResponse.keys.find(key => key.user_id === adminLogin.user.id);
const decrypted = await decryptMessage({
  conversationId,
  message: sentMessage.message,
  identity: peerIdentity,
  peerKey: {
    exchangePublicKey: adminKeyRecord.exchange_public_key,
    signingPublicKey: adminKeyRecord.signing_public_key
  }
});
assert.equal(decrypted, plaintext);

const adminMessages = await request('/api/admin/messages?limit=5', {
  headers: authHeaders(adminLogin.token)
});
const storedMessage = adminMessages.messages.find(message => message.id === sentMessage.message.id);
assert.match(storedMessage.content, /^e2ee:v1:/);
assert.doesNotMatch(storedMessage.content, new RegExp(plaintext));

console.log('E2EE API integration test passed');
