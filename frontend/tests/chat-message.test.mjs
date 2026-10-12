import test from 'node:test';
import assert from 'node:assert/strict';
import { createOutgoingChatContent } from '../src/utils/chatMessage.js';

test('plaintext is sent when no peer crypto context exists', async () => {
  const encryptMessage = async () => {
    throw new Error('encryption must not be called');
  };

  const content = await createOutgoingChatContent({
    content: '  offline recipient  ',
    conversationId: 7,
    senderId: 101,
    context: null,
    encryptMessage
  });

  assert.equal(content, 'offline recipient');
});

test('encrypted content is used when crypto context is ready', async () => {
  const context = {
    identity: { userId: 101 },
    peerKey: { exchangePublicKey: 'exchange', signingPublicKey: 'signing' }
  };
  let receivedOptions;
  const encryptMessage = async (options) => {
    receivedOptions = options;
    return 'e2ee:v1:encrypted';
  };

  const content = await createOutgoingChatContent({
    content: 'secure message',
    conversationId: 7,
    senderId: 101,
    context,
    encryptMessage
  });

  assert.equal(content, 'e2ee:v1:encrypted');
  assert.deepEqual(receivedOptions, {
    conversationId: 7,
    senderId: 101,
    plaintext: 'secure message',
    identity: context.identity,
    peerKey: context.peerKey
  });
});
