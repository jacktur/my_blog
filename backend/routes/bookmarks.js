const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { grantXP, checkAchievements, addActivity } = require('./gamification');

/**
 * GET /api/bookmarks
 * 获取当前用户的书签列表（分页）
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { total } = await dbGet(
      'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ?',
      [req.user.id]
    );

    const bookmarks = await dbAll(
      `SELECT bookmarks.id as bookmark_id, bookmarks.created_at as bookmarked_at,
              articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.user_id, articles.read_time,
              users.username, users.nickname,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM bookmarks
       JOIN articles ON bookmarks.article_id = articles.id
       JOIN users ON articles.user_id = users.id
       WHERE bookmarks.user_id = ?
       ORDER BY bookmarks.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    // 获取每篇文章的标签
    const bookmarksWithTags = await Promise.all(
      bookmarks.map(async (article) => {
        const tags = await dbAll(
          `SELECT tags.id, tags.name
           FROM tags
           JOIN article_tags ON tags.id = article_tags.tag_id
           WHERE article_tags.article_id = ?
           ORDER BY tags.name ASC`,
          [article.id]
        );
        return { ...article, tags };
      })
    );

    res.json({
      bookmarks: bookmarksWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('[BOOKMARKS] 获取书签列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/bookmarks
 * 添加书签
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { article_id } = req.body;

    if (!article_id) {
      return res.status(400).json({ error: '文章ID不能为空' });
    }

    // 检查文章是否存在
    const article = await dbGet('SELECT id FROM articles WHERE id = ?', [article_id]);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 检查是否已收藏
    const existing = await dbGet(
      'SELECT id FROM bookmarks WHERE user_id = ? AND article_id = ?',
      [req.user.id, article_id]
    );
    if (existing) {
      return res.json({ bookmarked: true, message: '已收藏过该文章' });
    }

    await dbRun(
      'INSERT INTO bookmarks (user_id, article_id) VALUES (?, ?)',
      [req.user.id, article_id]
    );

    const xp = await grantXP(req.user.id, 5, 'bookmark', 'article', article_id);
    await addActivity(req.user.id, 'bookmark', '收藏了文章 #' + article_id, 'article', article_id);
    const achievements = await checkAchievements(req.user.id, 'bookmark');

    res.status(201).json({ bookmarked: true, message: '收藏成功', gamification: { xp, achievements } });
  } catch (err) {
    console.error('[BOOKMARKS] 添加书签错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/bookmarks/:articleId
 * 删除书签
 */
router.delete('/:articleId', authenticateToken, async (req, res) => {
  try {
    const { articleId } = req.params;
    const result = await dbRun(
      'DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?',
      [req.user.id, articleId]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: '未收藏该文章' });
    }
    res.json({ bookmarked: false, message: '已取消收藏' });
  } catch (err) {
    console.error('[BOOKMARKS] 删除书签错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/bookmarks/:articleId/check
 * 检查当前用户是否收藏了指定文章
 */
router.get('/:articleId/check', authenticateToken, async (req, res) => {
  try {
    const { articleId } = req.params;
    const bookmark = await dbGet(
      'SELECT id FROM bookmarks WHERE user_id = ? AND article_id = ?',
      [req.user.id, articleId]
    );
    res.json({ bookmarked: !!bookmark });
  } catch (err) {
    console.error('[BOOKMARKS] 检查书签状态错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
