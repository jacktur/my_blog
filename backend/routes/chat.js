const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/conversations
 * 获取当前用户的所有会话（支持 ?scope=recent 用于铃铛下拉）
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isRecent = req.query.scope === 'recent';
    const limit = isRecent ? Math.min(5, parseInt(req.query.limit) || 5) : 50;

    const sql = `
      SELECT
        c.id,
        c.participant1_id,
        c.participant2_id,
        c.last_message,
        c.last_message_at,
        c.last_sender_id,
        c.created_at,
        u.id as other_user_id,
        u.username as other_username,
        u.nickname as other_nickname,
        u.avatar as other_avatar,
        (SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.id
           AND m.created_at > COALESCE(cr.last_read_at, '1970-01-01')
           AND m.sender_id != ?
        ) as unread_count
      FROM conversations c
      JOIN users u ON u.id = CASE WHEN c.participant1_id = ? THEN c.participant2_id ELSE c.participant1_id END
      LEFT JOIN conversation_readers cr ON cr.conversation_id = c.id AND cr.user_id = ?
      WHERE (c.participant1_id = ? OR c.participant2_id = ?)
      ORDER BY c.last_message_at DESC
    `;

    const params = [userId, userId, userId, userId, userId];

    if (isRecent) {
      params.push(limit);
    }

    const conversations = await dbAll(sql + (isRecent ? ' LIMIT ?' : ''), params);
    res.json({ conversations });
  } catch (err) {
    console.error('[CHAT] 获取会话列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/conversations
 * 创建或获取已有会话
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = parseInt(req.body.targetUserId, 10);

    if (!targetUserId || targetUserId === userId) {
      return res.status(400).json({ error: '无效的用户' });
    }

    const targetUser = await dbGet('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) return res.status(404).json({ error: '用户不存在' });

    const p1 = Math.min(userId, targetUserId);
    const p2 = Math.max(userId, targetUserId);

    let conversation = await dbGet(
      'SELECT id FROM conversations WHERE participant1_id = ? AND participant2_id = ?',
      [p1, p2]
    );

    if (!conversation) {
      const result = await dbRun(
        'INSERT INTO conversations (participant1_id, participant2_id) VALUES (?, ?)',
        [p1, p2]
      );
      conversation = { id: result.lastID };
    }

    for (const pid of [p1, p2]) {
      await dbRun(
        'INSERT OR IGNORE INTO conversation_readers (conversation_id, user_id) VALUES (?, ?)',
        [conversation.id, pid]
      );
    }

    res.json({ conversation: { id: conversation.id } });
  } catch (err) {
    console.error('[CHAT] 创建会话错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/conversations/:id/messages
 * 获取消息列表（分页）
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId)) return res.status(400).json({ error: '无效的会话ID' });

    const conv = await dbGet(
      'SELECT id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, userId, userId]
    );
    if (!conv) return res.status(403).json({ error: '无权访问此会话' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const messages = await dbAll(`
      SELECT m.id, m.sender_id, m.content, m.created_at,
             u.username as sender_username, u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [conversationId, limit, offset]);

    const totalRow = await dbGet(
      'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
      [conversationId]
    );

    res.json({
      messages,
      pagination: { page, limit, total: totalRow.total, totalPages: Math.ceil(totalRow.total / limit) }
    });
  } catch (err) {
    console.error('[CHAT] 获取消息错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/conversations/:id/messages
 * 发送消息
 */
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId)) return res.status(400).json({ error: '无效的会话ID' });

    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: '消息内容不能超过2000字' });
    }

    const conv = await dbGet(
      'SELECT id, participant1_id, participant2_id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, userId, userId]
    );
    if (!conv) return res.status(403).json({ error: '无权发言' });

    const result = await dbRun(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
      [conversationId, userId, content.trim()]
    );

    await dbRun(
      'UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP, last_sender_id = ? WHERE id = ?',
      [content.trim(), userId, conversationId]
    );

    await dbRun(
      'UPDATE conversation_readers SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );

    const otherUserId = conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id;
    await dbRun(
      'INSERT OR IGNORE INTO conversation_readers (conversation_id, user_id) VALUES (?, ?)',
      [conversationId, otherUserId]
    );

    const message = await dbGet(
      `SELECT m.id, m.sender_id, m.content, m.created_at,
              u.username as sender_username, u.avatar as sender_avatar
       FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
      [result.lastID]
    );

    res.status(201).json({ message });
  } catch (err) {
    console.error('[CHAT] 发送消息错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/conversations/:id/read
 * 标记会话为已读
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.id, 10);
    if (isNaN(conversationId)) return res.status(400).json({ error: '无效的会话ID' });

    const result = await dbRun(
      'UPDATE conversation_readers SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json({ message: '已标记为已读' });
  } catch (err) {
    console.error('[CHAT] 标记已读错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
