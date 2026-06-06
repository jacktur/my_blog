const express = require('express');
const router = express.Router();
const { dbGet, dbRun } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { grantXP, checkAchievements, addActivity } = require('./gamification');

/**
 * GET /api/articles/:id/progress
 * 获取当前用户在指定文章的阅读进度
 */
router.get('/articles/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const progress = await dbGet(
      'SELECT scroll_percentage FROM reading_progress WHERE user_id = ? AND article_id = ?',
      [req.user.id, id]
    );
    res.json({ scrollPercentage: progress ? progress.scroll_percentage : 0 });
  } catch (err) {
    console.error('[PROGRESS] 获取阅读进度错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/articles/:id/progress
 * 保存当前用户在指定文章的阅读进度
 */
router.put('/articles/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scrollPercentage } = req.body;
    const safePercentage = Math.max(0, Math.min(100, Number(scrollPercentage) || 0));

    const article = await dbGet('SELECT id, user_id, title FROM articles WHERE id = ?', [id]);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const previous = await dbGet(
      'SELECT scroll_percentage FROM reading_progress WHERE user_id = ? AND article_id = ?',
      [req.user.id, id]
    );

    await dbRun(
      `INSERT INTO reading_progress (user_id, article_id, scroll_percentage, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, article_id)
       DO UPDATE SET scroll_percentage = ?, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, id, safePercentage, safePercentage]
    );

    let gamification = null;
    const crossedReadThreshold = (previous?.scroll_percentage || 0) < 90 && safePercentage >= 90;
    if (crossedReadThreshold) {
      const shouldGrantXp = article.user_id !== req.user.id;
      const xp = shouldGrantXp
        ? await grantXP(req.user.id, 15, 'read_article', 'article', id)
        : null;
      await addActivity(req.user.id, 'read_article', '读完了文章「' + article.title + '」', 'article', id);
      const achievements = await checkAchievements(req.user.id, 'read_article');
      gamification = { xp, achievements };
    }

    res.json({ message: '进度已保存', gamification });
  } catch (err) {
    console.error('[PROGRESS] 保存阅读进度错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
