const E2EE_PREFIX = 'e2ee:v1:';
const ALGORITHM = 'ECDH-P256+A256GCM+ECDSA-P256';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function identityStorageKey(userId) {
  return `blog-e2ee-identity:${userId}`;
}

async function exportKeyPair(pair) {
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.exportKey('pkcs8', pair.privateKey),
    crypto.subtle.exportKey('spki', pair.publicKey)
  ]);

  return {
    privateKey: bytesToBase64(new Uint8Array(privateKey)),
    publicKey: bytesToBase64(new Uint8Array(publicKey))
  };
}

export async function createIdentity(userId) {
  const [exchange, signing] = await Promise.all([
    crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    ),
    crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )
  ]);

  const [exchangeKeys, signingKeys] = await Promise.all([
    exportKeyPair(exchange),
    exportKeyPair(signing)
  ]);

  return {
    v: 1,
    userId,
    algorithm: ALGORITHM,
    exchange: exchangeKeys,
    signing: signingKeys
  };
}

export function isEncryptedMessage(content) {
  return typeof content === 'string' && content.startsWith(E2EE_PREFIX);
}

export async function getStoredIdentity(userId) {
  const raw = localStorage.getItem(identityStorageKey(userId));
  if (!raw) return null;

  try {
    const identity = JSON.parse(raw);
    if (
      identity.v !== 1 ||
      identity.userId !== userId ||
      identity.algorithm !== ALGORITHM ||
      !identity.exchange?.privateKey ||
      !identity.signing?.privateKey
    ) {
      throw new Error('本地加密身份格式无效');
    }
    return identity;
  } catch (err) {
    localStorage.removeItem(identityStorageKey(userId));
    throw new Error('本地加密身份已损坏，请重新生成安全密钥', { cause: err });
  }
}

export async function ensureIdentity(userId) {
  const existing = await getStoredIdentity(userId);
  if (existing) return existing;

  const identity = await createIdentity(userId);
  localStorage.setItem(identityStorageKey(userId), JSON.stringify(identity));
  return identity;
}

export function getPublicIdentity(identity) {
  return {
    userId: identity.userId,
    algorithm: identity.algorithm,
    exchangePublicKey: identity.exchange.publicKey,
    signingPublicKey: identity.signing.publicKey
  };
}

export async function calculateFingerprint(publicKeyBase64) {
  const digest = await crypto.subtle.digest('SHA-256', base64ToBytes(publicKeyBase64));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function formatFingerprint(fingerprint) {
  if (!fingerprint) return '';
  return (fingerprint.match(/.{1,4}/g) || []).join('-').toUpperCase();
}

async function importExchangePrivateKey(base64) {
  return crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(base64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

async function importExchangePublicKey(base64) {
  return crypto.subtle.importKey(
    'spki',
    base64ToBytes(base64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

async function importSigningPrivateKey(base64) {
  return crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(base64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

async function importSigningPublicKey(base64) {
  return crypto.subtle.importKey(
    'spki',
    base64ToBytes(base64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
}

async function deriveConversationKey(conversationId, privateKeyBase64, peerPublicKeyBase64) {
  const [privateKey, peerPublicKey] = await Promise.all([
    importExchangePrivateKey(privateKeyBase64),
    importExchangePublicKey(peerPublicKeyBase64)
  ]);

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    256
  );

  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(`conversation:${conversationId}`),
      info: encoder.encode('my-blog-chat-e2ee-v1')
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function additionalData(conversationId, senderId) {
  return encoder.encode(JSON.stringify({ v: 1, conversationId, senderId }));
}

function signaturePayload(envelope) {
  return `v1|${envelope.conv}|${envelope.sender}|${envelope.iv}|${envelope.ct}`;
}

export async function encryptMessage({ conversationId, senderId, plaintext, identity, peerKey }) {
  const [conversationKey, signingPrivateKey] = await Promise.all([
    deriveConversationKey(
      conversationId,
      identity.exchange.privateKey,
      peerKey.exchangePublicKey
    ),
    importSigningPrivateKey(identity.signing.privateKey)
  ]);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(conversationId, senderId) },
    conversationKey,
    encoder.encode(plaintext)
  );

  const envelope = {
    v: 1,
    conv: conversationId,
    sender: senderId,
    alg: 'A256GCM',
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext))
  };

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingPrivateKey,
    encoder.encode(signaturePayload(envelope))
  );
  envelope.sig = bytesToBase64(new Uint8Array(signature));

  return `${E2EE_PREFIX}${JSON.stringify(envelope)}`;
}

export async function decryptMessage({ conversationId, message, identity, peerKey }) {
  if (!isEncryptedMessage(message.content)) return message.content;

  let envelope;
  try {
    envelope = JSON.parse(message.content.slice(E2EE_PREFIX.length));
  } catch {
    throw new Error('密文格式错误');
  }

  if (
    envelope.v !== 1 ||
    envelope.conv !== conversationId ||
    envelope.sender !== message.sender_id
  ) {
    throw new Error('消息上下文不匹配');
  }

  const signingPublicKeyBase64 = String(message.sender_id) === String(identity.userId)
    ? identity.signing.publicKey
    : peerKey.signingPublicKey;
  const signingPublicKey = await importSigningPublicKey(signingPublicKeyBase64);
  const validSignature = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingPublicKey,
    base64ToBytes(envelope.sig),
    encoder.encode(signaturePayload(envelope))
  );
  if (!validSignature) throw new Error('消息签名验证失败');

  const conversationKey = await deriveConversationKey(
    conversationId,
    identity.exchange.privateKey,
    peerKey.exchangePublicKey
  );

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(envelope.iv),
        additionalData: additionalData(conversationId, message.sender_id)
      },
      conversationKey,
      base64ToBytes(envelope.ct)
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error('消息解密失败');
  }
}
