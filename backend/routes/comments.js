const express = require('express');
const router = express.Router({ mergeParams: true });
const { dbGet, dbRun, dbAll, createNotification } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { grantXP, checkAchievements, addActivity } = require('./gamification');

/**
 * 输入清理 — 防 XSS
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  let cleaned = input.trim();
  cleaned = cleaned
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
  return cleaned;
}

/**
 * GET /api/articles/:id/comments
 * 获取文章评论列表（无需登录）
 */
router.get('/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await dbAll(
      `SELECT comments.id, comments.content, comments.created_at,
              users.id as user_id, users.username
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE comments.article_id = ?
       ORDER BY comments.created_at ASC`,
      [id]
    );

    res.json({ comments });
  } catch (err) {
    console.error('[COMMENTS] 获取评论列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/articles/:id/comments
 * 发表评论（需登录）
 */
router.post('/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: '评论内容不能超过2000个字符' });
    }

    // 检查文章是否存在
    const article = await dbGet('SELECT id, user_id FROM articles WHERE id = ?', [id]);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const safeContent = sanitizeInput(content);

    const result = await dbRun(
      'INSERT INTO comments (content, user_id, article_id) VALUES (?, ?, ?)',
      [safeContent, userId, id]
    );

    // 返回新创建的评论（包含用户名）
    const newComment = await dbGet(
      `SELECT comments.id, comments.content, comments.created_at,
              users.id as user_id, users.username
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE comments.id = ?`,
      [result.lastID]
    );

    // 通知文章作者
    if (article.user_id !== userId) {
      const commentPreview = safeContent.length > 50
        ? safeContent.slice(0, 50) + '...'
        : safeContent;
      await createNotification({
        userId: article.user_id,
        type: 'comment',
        message: `${req.user.username} 评论了你的文章`,
        relatedUserId: userId,
        articleId: id,
        commentPreview
      });
    }

    // XP + activity for commenting
    grantXP(userId, 10, 'comment', 'article', id);
    addActivity(userId, 'comment', '评论了文章 #' + id, 'article', id);

    res.status(201).json({ message: '评论发表成功', comment: newComment });
  } catch (err) {
    console.error('[COMMENTS] 发表评论错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/articles/:id/comments/:commentId
 * 删除评论（需登录，仅作者本人可删除）
 */
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await dbGet(
      'SELECT id, user_id FROM comments WHERE id = ?',
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    await dbRun('DELETE FROM comments WHERE id = ?', [commentId]);

    res.json({ message: '评论删除成功' });
  } catch (err) {
    console.error('[COMMENTS] 删除评论错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/articles/:id/likes/count
 * 获取文章点赞总数（无需登录）
 */
router.get('/likes/count', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dbGet(
      'SELECT COUNT(*) as count FROM likes WHERE article_id = ?',
      [id]
    );

    res.json({ likes: result.count });
  } catch (err) {
    console.error('[LIKES] 获取点赞数错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/articles/:id/likes/check
 * 检查当前用户是否已点赞（需登录）
 * 同时返回该用户在最近1分钟内的点赞次数
 */
router.get('/likes/check', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 获取最近1分钟的点赞次数
    const recentCount = await dbGet(
      `SELECT COUNT(*) as count FROM likes
       WHERE user_id = ? AND article_id = ?
       AND created_at > datetime('now', '-1 minute', 'localtime')`,
      [userId, id]
    );

    res.json({
      recentLikes: recentCount.count,
      remainingLikes: Math.max(0, 5 - recentCount.count)
    });
  } catch (err) {
    console.error('[LIKES] 检查点赞状态错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/articles/:id/like
 * 点赞文章（需登录）
 * 限制：同一用户对同一文章每分钟最多点赞5次
 */
router.post('/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查文章是否存在
    const article = await dbGet('SELECT id, user_id FROM articles WHERE id = ?', [id]);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 统计最近1分钟内该用户对这篇文章的点赞次数
    const recentLikes = await dbGet(
      `SELECT COUNT(*) as count FROM likes
       WHERE user_id = ? AND article_id = ?
       AND created_at > datetime('now', '-1 minute', 'localtime')`,
      [userId, id]
    );

    if (recentLikes.count >= 5) {
      return res.status(429).json({
        error: '点赞过于频繁，请稍后再试',
        retryAfter: 60
      });
    }

    // 插入点赞记录
    await dbRun(
      'INSERT INTO likes (user_id, article_id) VALUES (?, ?)',
      [userId, id]
    );

    // 通知文章作者
    if (article.user_id !== userId) {
      await createNotification({
        userId: article.user_id,
        type: 'like',
        message: `${req.user.username} 赞了你的文章`,
        relatedUserId: userId,
        articleId: id
      });
    }

    // XP for author receiving like
    if (article.user_id !== userId) {
      grantXP(article.user_id, 5, 'like_received', 'article', id);
      addActivity(article.user_id, 'like_received', '文章获得了来自 ' + req.user.username + ' 的点赞', 'article', id);
    }

    // 返回最新的总点赞数
    const totalLikes = await dbGet(
      'SELECT COUNT(*) as count FROM likes WHERE article_id = ?',
      [id]
    );

    res.status(201).json({
      message: '点赞成功',
      likes: totalLikes.count,
      remainingLikes: Math.max(0, 5 - (recentLikes.count + 1))
    });
  } catch (err) {
    console.error('[LIKES] 点赞错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;