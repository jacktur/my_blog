const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { calculateReadTime } = require('../utils/calculateReadTime');

/**
 * GET /api/drafts
 * 获取当前用户草稿列表
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const drafts = await dbAll(
      `SELECT id, title, substr(content, 1, 100) as excerpt, tags, cover_image,
              article_id, created_at, updated_at
       FROM drafts WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ drafts });
  } catch (err) {
    console.error('[DRAFTS] 获取草稿列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/drafts
 * 创建草稿
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags, cover_image, article_id } = req.body;
    const result = await dbRun(
      `INSERT INTO drafts (user_id, title, content, tags, cover_image, article_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, title || '', content || '', tags ? (Array.isArray(tags) ? tags.join(',') : tags) : '', cover_image || null, article_id || null]
    );
    res.status(201).json({ message: '草稿已保存', draft: { id: result.lastID } });
  } catch (err) {
    console.error('[DRAFTS] 创建草稿错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/drafts/:id
 * 更新草稿
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const draft = await dbGet('SELECT id, user_id FROM drafts WHERE id = ?', [id]);
    if (!draft) return res.status(404).json({ error: '草稿不存在' });
    if (draft.user_id !== req.user.id) return res.status(403).json({ error: '无权操作' });

    const { title, content, tags, cover_image } = req.body;
    await dbRun(
      `UPDATE drafts SET title = ?, content = ?, tags = ?, cover_image = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title || '', content || '', tags ? (Array.isArray(tags) ? tags.join(',') : tags) : '', cover_image || null, id]
    );
    res.json({ message: '草稿已更新' });
  } catch (err) {
    console.error('[DRAFTS] 更新草稿错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/drafts/:id
 * 删除草稿
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const draft = await dbGet('SELECT id, user_id FROM drafts WHERE id = ?', [id]);
    if (!draft) return res.status(404).json({ error: '草稿不存在' });
    if (draft.user_id !== req.user.id) return res.status(403).json({ error: '无权操作' });
    await dbRun('DELETE FROM drafts WHERE id = ?', [id]);
    res.json({ message: '草稿已删除' });
  } catch (err) {
    console.error('[DRAFTS] 删除草稿错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/drafts/:id/publish
 * 发布草稿（转为正式文章）
 */
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const draft = await dbGet('SELECT * FROM drafts WHERE id = ?', [id]);
    if (!draft) return res.status(404).json({ error: '草稿不存在' });
    if (draft.user_id !== req.user.id) return res.status(403).json({ error: '无权操作' });

    if (!draft.title || !draft.content) {
      return res.status(400).json({ error: '草稿标题和内容不能为空' });
    }

    const readTime = calculateReadTime(draft.content);
    const tags = draft.tags ? draft.tags.split(',').filter(Boolean) : [];
    const coverImage = draft.cover_image || null;

    const result = await dbRun(
      'INSERT INTO articles (title, content, user_id, read_time, cover_image) VALUES (?, ?, ?, ?, ?)',
      [draft.title, draft.content, req.user.id, readTime, coverImage]
    );

    // Set tags
    if (tags.length > 0) {
      const { setArticleTags } = require('./articles-utils');
      // Inline tag setup
      for (const tagName of tags) {
        const tag = tagName.trim().toLowerCase();
        if (tag) {
          await dbRun('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag]);
          const tagRow = await dbGet('SELECT id FROM tags WHERE name = ?', [tag]);
          if (tagRow) {
            await dbRun('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', [result.lastID, tagRow.id]);
          }
        }
      }
    }

    // Delete draft
    await dbRun('DELETE FROM drafts WHERE id = ?', [id]);

    res.status(201).json({ message: '草稿已发布', article: { id: result.lastID } });
  } catch (err) {
    console.error('[DRAFTS] 发布草稿错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
