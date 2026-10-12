export async function createOutgoingChatContent({
  content,
  conversationId,
  senderId,
  context,
  encryptMessage
}) {
  const plaintext = content.trim();

  if (!context) return plaintext;

  return encryptMessage({
    conversationId,
    senderId,
    plaintext,
    identity: context.identity,
    peerKey: context.peerKey
  });
}
