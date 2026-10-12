import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIdentity,
  encryptMessage,
  decryptMessage
} from '../src/utils/e2ee.js';

function peerKeyFor(identity) {
  return {
    exchangePublicKey: identity.exchange.publicKey,
    signingPublicKey: identity.signing.publicKey
  };
}

test('a sender can decrypt their own encrypted message', async () => {
  const alice = await createIdentity(101);
  const bob = await createIdentity(202);
  const conversationId = 7;
  const plaintext = 'sent by alice';

  const encrypted = await encryptMessage({
    conversationId,
    senderId: alice.userId,
    plaintext,
    identity: alice,
    peerKey: peerKeyFor(bob)
  });

  const decrypted = await decryptMessage({
    conversationId,
    message: { id: 1, sender_id: alice.userId, content: encrypted },
    identity: alice,
    peerKey: peerKeyFor(bob)
  });

  assert.equal(decrypted, plaintext);
});
