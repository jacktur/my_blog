const express = require('express');
const router = express.Router();
const { dbAll } = require('../database');

/**
 * GET /api/tags
 * 获取所有标签及其文章数量
 */
router.get('/', async (req, res) => {
  try {
    const tags = await dbAll(
      `SELECT tags.id, tags.name, COUNT(article_tags.article_id) as article_count
       FROM tags
       LEFT JOIN article_tags ON tags.id = article_tags.tag_id
       GROUP BY tags.id
       ORDER BY article_count DESC, tags.name ASC`
    );

    res.json({ tags });
  } catch (err) {
    console.error('[TAGS] 获取标签列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
