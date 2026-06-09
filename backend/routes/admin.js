const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken, requireAdmin);

function parseLimit(value, fallback = 30, max = 100) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

router.get('/summary', async (req, res) => {
  try {
    const [users, articles, comments, messages, bannedUsers, todayUsers, todayArticles] =
      await Promise.all([
        dbGet('SELECT COUNT(*) as count FROM users'),
        dbGet('SELECT COUNT(*) as count FROM articles'),
        dbGet('SELECT COUNT(*) as count FROM comments'),
        dbGet('SELECT COUNT(*) as count FROM messages'),
        dbGet("SELECT COUNT(*) as count FROM users WHERE status = 'banned'"),
        dbGet("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')"),
        dbGet("SELECT COUNT(*) as count FROM articles WHERE date(created_at) = date('now')"),
      ]);

    res.json({
      summary: {
        users: users.count,
        articles: articles.count,
        comments: comments.count,
        messages: messages.count,
        bannedUsers: bannedUsers.count,
        todayUsers: todayUsers.count,
        todayArticles: todayArticles.count,
      },
    });
  } catch (err) {
    console.error('[ADMIN] 获取概览错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 50);
    const users = await dbAll(
      `SELECT u.id, u.username, u.nickname, u.email, u.role, u.status, u.created_at,
              (SELECT COUNT(*) FROM articles WHERE user_id = u.id) as article_count,
              (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count,
              (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as message_count
       FROM users u
       ORDER BY u.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ users });
  } catch (err) {
    console.error('[ADMIN] 获取用户列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const status = req.body.status === 'banned' ? 'banned' : 'active';
    if (!targetUserId) return res.status(400).json({ error: '无效的用户ID' });
    if (targetUserId === req.user.id) return res.status(400).json({ error: '不能封禁当前站长账号' });

    const targetUser = await dbGet('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) return res.status(404).json({ error: '用户不存在' });
    if (targetUser.role === 'admin' && status === 'banned') {
      return res.status(400).json({ error: '不能封禁其他站长账号' });
    }

    await dbRun('UPDATE users SET status = ? WHERE id = ?', [status, targetUserId]);
    res.json({ message: status === 'banned' ? '用户已封禁' : '用户已解封', status });
  } catch (err) {
    console.error('[ADMIN] 更新用户状态错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/articles', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const articles = await dbAll(
      `SELECT a.id, a.title, substr(a.content, 1, 140) as excerpt, a.created_at,
              a.view_count, u.id as user_id, u.username, u.nickname,
              (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count
       FROM articles a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ articles });
  } catch (err) {
    console.error('[ADMIN] 获取文章列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/articles/:id', async (req, res) => {
  try {
    const article = await dbGet('SELECT id FROM articles WHERE id = ?', [req.params.id]);
    if (!article) return res.status(404).json({ error: '文章不存在' });
    await dbRun('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ message: '文章已删除' });
  } catch (err) {
    console.error('[ADMIN] 删除文章错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const comments = await dbAll(
      `SELECT c.id, c.content, c.created_at, c.article_id, a.title as article_title,
              u.id as user_id, u.username, u.nickname
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN articles a ON a.id = c.article_id
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ comments });
  } catch (err) {
    console.error('[ADMIN] 获取评论列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await dbGet('SELECT id FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ error: '评论不存在' });
    await dbRun('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: '评论已删除' });
  } catch (err) {
    console.error('[ADMIN] 删除评论错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const messages = await dbAll(
      `SELECT m.id, m.content, m.created_at, m.conversation_id,
              sender.id as sender_id, sender.username as sender_username, sender.nickname as sender_nickname,
              receiver.id as receiver_id, receiver.username as receiver_username, receiver.nickname as receiver_nickname
       FROM messages m
       JOIN users sender ON sender.id = m.sender_id
       JOIN conversations c ON c.id = m.conversation_id
       JOIN users receiver ON receiver.id = CASE
         WHEN c.participant1_id = m.sender_id THEN c.participant2_id
         ELSE c.participant1_id
       END
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ messages });
  } catch (err) {
    console.error('[ADMIN] 获取私信列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/messages/:id', async (req, res) => {
  try {
    const message = await dbGet('SELECT id, conversation_id FROM messages WHERE id = ?', [req.params.id]);
    if (!message) return res.status(404).json({ error: '私信不存在' });

    await dbRun('DELETE FROM messages WHERE id = ?', [req.params.id]);
    const lastMessage = await dbGet(
      `SELECT id, content, sender_id, created_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [message.conversation_id]
    );
    await dbRun(
      `UPDATE conversations
       SET last_message = ?, last_message_at = ?, last_sender_id = ?
       WHERE id = ?`,
      [
        lastMessage?.content || null,
        lastMessage?.created_at || null,
        lastMessage?.sender_id || null,
        message.conversation_id,
      ]
    );

    res.json({ message: '私信已删除' });
  } catch (err) {
    console.error('[ADMIN] 删除私信错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
