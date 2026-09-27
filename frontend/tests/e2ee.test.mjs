import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIdentity,
  encryptMessage,
  decryptMessage,
  calculateFingerprint
} from '../src/utils/e2ee.js';

function peerKeyFor(identity) {
  return {
    exchangePublicKey: identity.exchange.publicKey,
    signingPublicKey: identity.signing.publicKey
  };
}

test('两个用户可以互相解密端到端加密消息', async () => {
  const alice = await createIdentity(101);
  const bob = await createIdentity(202);
  const conversationId = 7;
  const plaintext = '这是端到端加密测试消息 🔐';

  const encrypted = await encryptMessage({
    conversationId,
    senderId: 101,
    plaintext,
    identity: alice,
    peerKey: peerKeyFor(bob)
  });

  const decrypted = await decryptMessage({
    conversationId,
    message: { id: 1, sender_id: 101, content: encrypted },
    identity: bob,
    peerKey: peerKeyFor(alice)
  });

  assert.equal(decrypted, plaintext);
  assert.match(encrypted, /^e2ee:v1:/);
  assert.doesNotMatch(encrypted, new RegExp(plaintext));
});

test('密文被篡改后签名校验失败', async () => {
  const alice = await createIdentity(101);
  const bob = await createIdentity(202);
  const conversationId = 7;

  const encrypted = await encryptMessage({
    conversationId,
    senderId: 101,
    plaintext: '原始消息',
    identity: alice,
    peerKey: peerKeyFor(bob)
  });
  const envelope = JSON.parse(encrypted.slice('e2ee:v1:'.length));
  const tamperedCiphertext = envelope.ct.startsWith('QQ')
    ? `RR${envelope.ct.slice(2)}`
    : `QQ${envelope.ct.slice(2)}`;
  const tampered = `e2ee:v1:${JSON.stringify({ ...envelope, ct: tamperedCiphertext })}`;

  await assert.rejects(
    decryptMessage({
      conversationId,
      message: { id: 1, sender_id: 101, content: tampered },
      identity: bob,
      peerKey: peerKeyFor(alice)
    }),
    /签名|解密/
  );
});

test('公钥指纹是稳定的 SHA-256 摘要', async () => {
  const alice = await createIdentity(101);
  const first = await calculateFingerprint(alice.exchange.publicKey);
  const second = await calculateFingerprint(alice.exchange.publicKey);

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});
