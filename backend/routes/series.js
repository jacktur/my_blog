const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/series
 * 获取公开系列列表
 */
router.get('/', async (req, res) => {
  try {
    const series = await dbAll(
      `SELECT s.id, s.title, s.description, s.cover_image, s.user_id, u.username, u.nickname,
              s.created_at,
              (SELECT COUNT(*) FROM series_articles WHERE series_id = s.id) as article_count
       FROM series s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.updated_at DESC`
    );
    res.json({ series });
  } catch (err) {
    console.error('[SERIES] 获取系列列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/mine/list', authenticateToken, async (req, res) => {
  try {
    const series = await dbAll(
      `SELECT s.id, s.title, s.description, s.cover_image, s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM series_articles WHERE series_id = s.id) as article_count
       FROM series s
       WHERE s.user_id = ?
       ORDER BY s.updated_at DESC`,
      [req.user.id]
    );
    res.json({ series });
  } catch (err) {
    console.error('[SERIES] 获取我的系列错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/mine/articles', authenticateToken, async (req, res) => {
  try {
    const articles = await dbAll(
      `SELECT id, title, created_at
       FROM articles
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ articles });
  } catch (err) {
    console.error('[SERIES] 获取我的文章错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/series/:id
 * 获取系列详情（含文章列表）
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const series = await dbGet(
      `SELECT s.*, u.username, u.nickname FROM series s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );
    if (!series) return res.status(404).json({ error: '系列不存在' });

    const articles = await dbAll(
      `SELECT a.id, a.title, substr(a.content, 1, 200) as excerpt, a.created_at, a.read_time,
              sa.position
       FROM series_articles sa
       JOIN articles a ON sa.article_id = a.id
       WHERE sa.series_id = ? AND a.deleted_at IS NULL
       ORDER BY sa.position ASC`,
      [id]
    );

    res.json({ series, articles });
  } catch (err) {
    console.error('[SERIES] 获取系列详情错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/series
 * 创建系列
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, cover_image } = req.body;
    if (!title) return res.status(400).json({ error: '系列标题不能为空' });

    const result = await dbRun(
      'INSERT INTO series (user_id, title, description, cover_image) VALUES (?, ?, ?, ?)',
      [req.user.id, title, description || null, cover_image || null]
    );
    res.status(201).json({ message: '系列创建成功', series: { id: result.lastID } });
  } catch (err) {
    console.error('[SERIES] 创建系列错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/series/:id
 * 更新系列
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const s = await dbGet('SELECT id, user_id FROM series WHERE id = ?', [id]);
    if (!s) return res.status(404).json({ error: '系列不存在' });
    if (s.user_id !== req.user.id) return res.status(403).json({ error: '无权操作' });

    const { title, description, cover_image } = req.body;
    await dbRun(
      'UPDATE series SET title = COALESCE(?, title), description = COALESCE(?, description), cover_image = COALESCE(?, cover_image), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, cover_image, id]
    );
    res.json({ message: '系列已更新' });
  } catch (err) {
    console.error('[SERIES] 更新系列错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/series/:id
 * 删除系列
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const s = await dbGet('SELECT id, user_id FROM series WHERE id = ?', [id]);
    if (!s) return res.status(404).json({ error: '系列不存在' });
    if (s.user_id !== req.user.id) return res.status(403).json({ error: '无权操作' });
    await dbRun('DELETE FROM series WHERE id = ?', [id]);
    res.json({ message: '系列已删除' });
  } catch (err) {
    console.error('[SERIES] 删除系列错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/series/:id/articles
 * 添加文章到系列
 */
router.post('/:id/articles', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { article_id } = req.body;
    if (!article_id) return res.status(400).json({ error: '文章ID不能为空' });

    const s = await dbGet('SELECT id, user_id FROM series WHERE id = ?', [id]);
    if (!s) return res.status(404).json({ error: '系列不存在' });
    if (s.user_id !== req.user.id) return res.status(403).json({ error: '无权操作' });

    // Get next position
    const maxPos = await dbGet('SELECT COALESCE(MAX(position), -1) + 1 as next FROM series_articles WHERE series_id = ?', [id]);
    await dbRun('INSERT OR IGNORE INTO series_articles (series_id, article_id, position) VALUES (?, ?, ?)',
      [id, article_id, maxPos.next]);
    res.json({ message: '文章已添加到系列' });
  } catch (err) {
    console.error('[SERIES] 添加文章错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/series/:id/articles/:articleId
 * 从系列移除文章
 */
router.delete('/:id/articles/:articleId', authenticateToken, async (req, res) => {
  try {
    const { id, articleId } = req.params;
    const s = await dbGet('SELECT user_id FROM series WHERE id = ?', [id]);
    if (!s) return res.status(404).json({ error: '系列不存在' });
    if (s.user_id !== req.user.id) return res.status(403).json({ error: '无权操作' });
    await dbRun('DELETE FROM series_articles WHERE series_id = ? AND article_id = ?', [id, articleId]);
    res.json({ message: '文章已从系列移除' });
  } catch (err) {
    console.error('[SERIES] 移除文章错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
