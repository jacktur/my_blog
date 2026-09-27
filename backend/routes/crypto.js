const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const ALGORITHM = 'ECDH-P256+A256GCM+ECDSA-P256';

function normalizePublicKey(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 必须是 Base64 公钥`);
  }

  const normalized = value.trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error(`${fieldName} 格式无效`);
  }

  const raw = Buffer.from(normalized, 'base64');
  if (raw.length < 60 || raw.length > 160 || raw.toString('base64') !== normalized) {
    throw new Error(`${fieldName} 不是有效的 P-256 公钥`);
  }

  return normalized;
}

function calculateFingerprint(publicKey) {
  return crypto
    .createHash('sha256')
    .update(Buffer.from(publicKey, 'base64'))
    .digest('hex');
}

router.put('/keys', authenticateToken, async (req, res) => {
  try {
    const exchangePublicKey = normalizePublicKey(req.body.exchangePublicKey, '交换公钥');
    const signingPublicKey = normalizePublicKey(req.body.signingPublicKey, '签名公钥');
    const exchangeFingerprint = calculateFingerprint(exchangePublicKey);
    const signingFingerprint = calculateFingerprint(signingPublicKey);

    await dbRun(
      `INSERT INTO user_crypto_keys (
         user_id, algorithm, exchange_public_key, exchange_fingerprint,
         signing_public_key, signing_fingerprint, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         algorithm = excluded.algorithm,
         exchange_public_key = excluded.exchange_public_key,
         exchange_fingerprint = excluded.exchange_fingerprint,
         signing_public_key = excluded.signing_public_key,
         signing_fingerprint = excluded.signing_fingerprint,
         updated_at = CURRENT_TIMESTAMP`,
      [
        req.user.id,
        ALGORITHM,
        exchangePublicKey,
        exchangeFingerprint,
        signingPublicKey,
        signingFingerprint
      ]
    );

    res.json({
      key: {
        user_id: req.user.id,
        algorithm: ALGORITHM,
        exchangePublicKey,
        exchangeFingerprint,
        signingPublicKey,
        signingFingerprint
      }
    });
  } catch (err) {
    if (err.message.includes('公钥') || err.message.includes('格式')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[CRYPTO] 保存加密公钥错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    if (isNaN(conversationId)) return res.status(400).json({ error: '无效的会话ID' });

    const conversation = await dbGet(
      `SELECT participant1_id, participant2_id
       FROM conversations
       WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)`,
      [conversationId, req.user.id, req.user.id]
    );
    if (!conversation) return res.status(403).json({ error: '无权访问此会话' });

    const participants = [conversation.participant1_id, conversation.participant2_id];
    const keys = await dbAll(
      `SELECT user_id, algorithm, exchange_public_key, exchange_fingerprint,
              signing_public_key, signing_fingerprint, updated_at
       FROM user_crypto_keys
       WHERE user_id IN (?, ?)`,
      participants
    );

    res.json({ participants, keys });
  } catch (err) {
    console.error('[CRYPTO] 获取会话公钥错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
