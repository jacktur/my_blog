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

function cleanReason(value) {
  const reason = String(value || '').trim();
  return reason || '站长审核处理';
}

async function logAction(adminId, actionType, targetType, targetId, reason, snapshot) {
  await dbRun(
    `INSERT INTO moderation_actions
     (admin_id, action_type, target_type, target_id, reason, snapshot_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, actionType, targetType, targetId, reason, snapshot ? JSON.stringify(snapshot) : null]
  );
}

router.get('/summary', async (req, res) => {
  try {
    const [users, articles, comments, messages, bannedUsers, todayUsers, todayArticles, openReports] =
      await Promise.all([
        dbGet('SELECT COUNT(*) as count FROM users'),
        dbGet('SELECT COUNT(*) as count FROM articles WHERE deleted_at IS NULL'),
        dbGet('SELECT COUNT(*) as count FROM comments WHERE deleted_at IS NULL'),
        dbGet('SELECT COUNT(*) as count FROM messages WHERE deleted_at IS NULL'),
        dbGet("SELECT COUNT(*) as count FROM users WHERE status = 'banned'"),
        dbGet("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')"),
        dbGet("SELECT COUNT(*) as count FROM articles WHERE deleted_at IS NULL AND date(created_at) = date('now')"),
        dbGet("SELECT COUNT(*) as count FROM reports WHERE status = 'open'"),
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
        openReports: openReports.count,
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

    const targetUser = await dbGet('SELECT id, username, nickname, email, role, status, created_at FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) return res.status(404).json({ error: '用户不存在' });
    if (targetUser.role === 'admin' && status === 'banned') {
      return res.status(400).json({ error: '不能封禁其他站长账号' });
    }

    await dbRun('UPDATE users SET status = ? WHERE id = ?', [status, targetUserId]);
    await logAction(
      req.user.id,
      status === 'banned' ? 'ban' : 'unban',
      'user',
      targetUser.id,
      cleanReason(req.body.reason),
      { ...targetUser, next_status: status }
    );
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
              (SELECT COUNT(*) FROM comments WHERE article_id = a.id AND deleted_at IS NULL) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count
       FROM articles a
       JOIN users u ON u.id = a.user_id
       WHERE a.deleted_at IS NULL
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
    const reason = cleanReason(req.body.reason);
    const article = await dbGet('SELECT id, title, content, user_id, created_at FROM articles WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!article) return res.status(404).json({ error: '文章不存在' });
    await dbRun("UPDATE articles SET deleted_at = datetime('now') WHERE id = ?", [req.params.id]);
    await logAction(req.user.id, 'delete', 'article', article.id, reason, article);
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
       WHERE c.deleted_at IS NULL
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
    const reason = cleanReason(req.body.reason);
    const comment = await dbGet('SELECT id, content, user_id, article_id, created_at FROM comments WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!comment) return res.status(404).json({ error: '评论不存在' });
    await dbRun("UPDATE comments SET deleted_at = datetime('now') WHERE id = ?", [req.params.id]);
    await logAction(req.user.id, 'delete', 'comment', comment.id, reason, comment);
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
       WHERE m.deleted_at IS NULL
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
    const reason = cleanReason(req.body.reason);
    const message = await dbGet('SELECT id, conversation_id, sender_id, content, created_at FROM messages WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!message) return res.status(404).json({ error: '私信不存在' });

    await dbRun("UPDATE messages SET deleted_at = datetime('now') WHERE id = ?", [req.params.id]);
    await logAction(req.user.id, 'delete', 'message', message.id, reason, message);
    const lastMessage = await dbGet(
      `SELECT id, content, sender_id, created_at
       FROM messages
       WHERE conversation_id = ?
         AND deleted_at IS NULL
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

router.get('/reports', async (req, res) => {
  try {
    const reports = await dbAll(
      `SELECT r.*, reporter.username as reporter_username, reporter.nickname as reporter_nickname,
              resolver.username as resolver_username, resolver.nickname as resolver_nickname
       FROM reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       LEFT JOIN users resolver ON resolver.id = r.resolved_by
       ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC
       LIMIT ?`,
      [parseLimit(req.query.limit, 50)]
    );
    res.json({ reports });
  } catch (err) {
    console.error('[ADMIN] 获取举报列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.patch('/reports/:id/status', async (req, res) => {
  try {
    const status = req.body.status === 'resolved' ? 'resolved' : 'dismissed';
    const result = await dbRun(
      "UPDATE reports SET status = ?, resolved_at = datetime('now'), resolved_by = ? WHERE id = ?",
      [status, req.user.id, req.params.id]
    );
    if (result.changes === 0) return res.status(404).json({ error: '举报不存在' });
    res.json({ message: status === 'resolved' ? '举报已处理' : '举报已驳回' });
  } catch (err) {
    console.error('[ADMIN] 更新举报状态错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/actions', async (req, res) => {
  try {
    const actions = await dbAll(
      `SELECT ma.*, u.username as admin_username, u.nickname as admin_nickname
       FROM moderation_actions ma
       JOIN users u ON u.id = ma.admin_id
       ORDER BY ma.created_at DESC
       LIMIT ?`,
      [parseLimit(req.query.limit, 50)]
    );
    res.json({ actions });
  } catch (err) {
    console.error('[ADMIN] 获取审核日志错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/actions/:id/restore', async (req, res) => {
  try {
    const action = await dbGet('SELECT * FROM moderation_actions WHERE id = ?', [req.params.id]);
    if (!action) return res.status(404).json({ error: '审核记录不存在' });
    if (action.undone_at) return res.status(409).json({ error: '该操作已撤销' });
    if (action.action_type !== 'delete') return res.status(400).json({ error: '该操作不能恢复' });

    if (action.target_type === 'article') {
      await dbRun('UPDATE articles SET deleted_at = NULL WHERE id = ?', [action.target_id]);
    } else if (action.target_type === 'comment') {
      await dbRun('UPDATE comments SET deleted_at = NULL WHERE id = ?', [action.target_id]);
    } else if (action.target_type === 'message') {
      await dbRun('UPDATE messages SET deleted_at = NULL WHERE id = ?', [action.target_id]);
    } else {
      return res.status(400).json({ error: '该对象不能恢复' });
    }
    await dbRun("UPDATE moderation_actions SET undone_at = datetime('now') WHERE id = ?", [action.id]);
    res.json({ message: '已恢复' });
  } catch (err) {
    console.error('[ADMIN] 恢复审核操作错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
