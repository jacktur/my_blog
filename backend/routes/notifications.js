const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/notifications
 * 获取当前用户的通知列表（分页）
 * Query: ?page=1&type=unread
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    let countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    let listSql = `
      SELECT n.id, n.type, n.message, n.is_read, n.created_at,
             n.article_id, n.comment_preview,
             u.id as related_user_id, u.username as related_username,
             u.nickname as related_nickname,
             u.avatar as related_avatar
      FROM notifications n
      LEFT JOIN users u ON n.related_user_id = u.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const params = [userId];
    const listParams = [userId, limit, offset];

    if (req.query.type === 'unread') {
      countSql += ' AND is_read = 0';
      listSql = listSql.replace('WHERE n.user_id = ?', 'WHERE n.user_id = ? AND n.is_read = 0');
    }

    const [{ total }] = await Promise.all([
      dbGet(countSql, params)
    ]);

    const notifications = await dbAll(listSql, listParams);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] 获取通知列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/notifications/unread-count
 * 获取当前用户的未读通知数量 + 私信未读数量
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const notifResult = await dbGet(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    const messageResult = await dbGet(
      `SELECT COUNT(*) as count FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.participant1_id = ? OR c.participant2_id = ?)
         AND m.sender_id != ?
         AND m.created_at > COALESCE(
           (SELECT last_read_at FROM conversation_readers
            WHERE conversation_id = c.id AND user_id = ?),
           '1970-01-01'
         )`,
      [userId, userId, userId, userId]
    );

    const unreadCount = notifResult.count;
    const messageUnreadCount = messageResult.count;

    res.json({
      unreadCount,
      messageUnreadCount,
      totalUnread: unreadCount + messageUnreadCount
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] 获取未读数错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/notifications/read-all
 * 标记所有通知为已读
 * 注意：这条路由必须在 /:id/read 之前注册
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await dbRun(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ message: '全部标记已读' });
  } catch (err) {
    console.error('[NOTIFICATIONS] 全部标记已读错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * 标记单条通知为已读
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await dbGet(
      'SELECT id, user_id FROM notifications WHERE id = ?',
      [id]
    );

    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权操作' });
    }

    await dbRun('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.json({ message: '标记已读' });
  } catch (err) {
    console.error('[NOTIFICATIONS] 标记已读错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
