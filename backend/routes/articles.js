const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { calculateReadTime } = require('../utils/calculateReadTime');
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
 * 辅助：为文章设置标签（覆盖式）
 */
async function setArticleTags(articleId, tagNames) {
  // 删除旧关联
  await dbRun('DELETE FROM article_tags WHERE article_id = ?', [articleId]);

  if (!tagNames || tagNames.length === 0) return;

  for (const name of tagNames) {
    const tag = name.trim().toLowerCase();
    if (!tag) continue;

    // INSERT OR IGNORE 避免重复
    await dbRun('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag]);
    const tagRow = await dbGet('SELECT id FROM tags WHERE name = ?', [tag]);
    if (tagRow) {
      await dbRun('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', [articleId, tagRow.id]);
    }
  }
}

/**
 * 辅助：获取文章的标签列表
 */
async function getArticleTags(articleId) {
  return dbAll(
    `SELECT tags.id, tags.name
     FROM tags
     JOIN article_tags ON tags.id = article_tags.tag_id
     WHERE article_tags.article_id = ?
     ORDER BY tags.name ASC`,
    [articleId]
  );
}

function isValidTitle(title) {
  return typeof title === 'string' && title.length >= 1 && title.length <= 200;
}

function isValidContent(content) {
  return typeof content === 'string' && content.length >= 1 && content.length <= 50000;
}

/**
 * GET /api/articles
 * 获取文章列表
 * 支持 ?tag=xxx 按标签筛选（无需登录）
 * 支持 ?scope=following 获取关注作者的文章（需登录）
 * 按发布时间倒序，返回摘要信息
 */
router.get('/', (req, res, next) => {
  // 当 scope=following 时，需要先通过认证中间件
  if (req.query.scope === 'following') {
    return authenticateToken(req, res, next);
  }
  next();
}, async (req, res) => {
  try {
    const { tag, scope } = req.query;

    let sql;
    let params = [];

    if (scope === 'following') {
      // req.user 由 authenticateToken 中间件注入
      const userId = req.user.id;

      sql = `SELECT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image,
              articles.user_id,
              users.username,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       WHERE articles.user_id IN (
         SELECT following_id FROM follows WHERE follower_id = ?
       )
       ORDER BY articles.created_at DESC`;
      params = [userId];
    } else if (tag) {
      sql = `SELECT DISTINCT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image,
              articles.user_id,
              users.username,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       JOIN article_tags ON articles.id = article_tags.article_id
       JOIN tags ON article_tags.tag_id = tags.id
       WHERE tags.name = ?
       ORDER BY articles.created_at DESC`;
      params = [tag.toLowerCase().trim()];
    } else {
      sql = `SELECT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image,
              articles.user_id,
              users.username,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       ORDER BY articles.created_at DESC`;
    }

    const articles = await dbAll(sql, params);

    // 为每篇文章获取标签
    const articlesWithTags = await Promise.all(
      articles.map(async (article) => {
        const tags = await getArticleTags(article.id);
        return { ...article, tags };
      })
    );

    res.json({ articles: articlesWithTags });
  } catch (err) {
    console.error('[ARTICLES] 获取列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/articles/search
 * 搜索文章（无需登录）
 * 按标题和内容模糊匹配，按发布时间倒序
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }

    const keyword = `%${q.trim()}%`;

    const articles = await dbAll(
      `SELECT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image,
              articles.user_id,
              users.username,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       WHERE articles.title LIKE ? OR articles.content LIKE ?
       ORDER BY articles.created_at DESC`,
      [keyword, keyword]
    );

    // 获取每篇文章的标签
    const articlesWithTags = await Promise.all(
      articles.map(async (article) => {
        const tags = await getArticleTags(article.id);
        return { ...article, tags };
      })
    );

    res.json({ articles: articlesWithTags, query: q.trim() });
  } catch (err) {
    console.error('[ARTICLES] 搜索错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/articles/:id
 * 获取单篇文章详情（无需登录）
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const article = await dbGet(
      `SELECT articles.id, articles.title, articles.content,
              articles.created_at, articles.read_time, articles.cover_image, articles.view_count,
              articles.user_id, users.username
       FROM articles
       JOIN users ON articles.user_id = users.id
       WHERE articles.id = ?`,
      [id]
    );

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 获取标签
    const tags = await getArticleTags(article.id);

    // 浏览计数递增（基于 IP 去重，每24h 同一 IP 只计一次）
    const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const existingView = await dbGet(
      "SELECT id FROM article_views WHERE article_id = ? AND ip = ? AND date(viewed_at) = date('now')",
      [id, clientIp]
    );
    if (!existingView) {
      await dbRun(
        'INSERT INTO article_views (article_id, ip) VALUES (?, ?)',
        [id, clientIp]
      );
      await dbRun(
        'UPDATE articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
        [id]
      );
      article.view_count = (article.view_count || 0) + 1;
    }

    res.json({ article: { ...article, tags } });
  } catch (err) {
    console.error('[ARTICLES] 获取详情错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/articles
 * 创建文章（需登录）
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    if (!isValidTitle(title)) {
      return res.status(400).json({ error: '标题长度需在 1-200 个字符之间' });
    }

    if (!isValidContent(content)) {
      return res.status(400).json({ error: '内容长度需在 1-50000 个字符之间' });
    }

    const safeTitle = sanitizeInput(title);
    // Markdown 内容保留原始格式，不做 HTML 转义（前端渲染时用 DOMPurify 清洗）
    const userId = req.user.id;
    const readTime = calculateReadTime(content);

    const result = await dbRun(
      'INSERT INTO articles (title, content, user_id, read_time, cover_image) VALUES (?, ?, ?, ?, ?)',
      [safeTitle, content, userId, readTime, req.body.cover_image || null]
    );

    // 设置标签
    if (tags && Array.isArray(tags)) {
      await setArticleTags(result.lastID, tags);
    }

    const articleTags = await getArticleTags(result.lastID);

    res.status(201).json({
      message: '文章创建成功',
      article: { id: result.lastID, title: safeTitle, user_id: userId, tags: articleTags }
    });

    // Fire-and-forget: XP + achievements + activity
    grantXP(userId, 50, 'publish_article', 'article', result.lastID);
    addActivity(userId, 'publish_article', '发布了文章「' + safeTitle + '」', 'article', result.lastID, { title: safeTitle });
    checkAchievements(userId, 'publish_article', { hour: new Date().getHours() });
  } catch (err) {
    console.error('[ARTICLES] 创建错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/articles/:id
 * 更新文章（需登录，仅作者本人可修改）
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.user.id;

    // 检查文章是否存在且属于当前用户
    const article = await dbGet(
      'SELECT id, user_id FROM articles WHERE id = ?',
      [id]
    );

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    if (article.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此文章' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    if (!isValidTitle(title) || !isValidContent(content)) {
      return res.status(400).json({ error: '标题或内容长度不合法' });
    }

    const safeTitle = sanitizeInput(title);
    const readTime = calculateReadTime(content);

    await dbRun(
      'UPDATE articles SET title = ?, content = ?, read_time = ?, cover_image = COALESCE(?, cover_image) WHERE id = ?',
      [safeTitle, content, readTime, req.body.cover_image || null, id]
    );

    // 更新标签
    if (tags && Array.isArray(tags)) {
      await setArticleTags(id, tags);
    }

    res.json({ message: '文章更新成功' });
  } catch (err) {
    console.error('[ARTICLES] 更新错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/articles/:id
 * 删除文章（需登录，仅作者本人可删除）
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const article = await dbGet(
      'SELECT id, user_id FROM articles WHERE id = ?',
      [id]
    );

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    if (article.user_id !== userId) {
      return res.status(403).json({ error: '无权删除此文章' });
    }

    await dbRun('DELETE FROM articles WHERE id = ?', [id]);

    res.json({ message: '文章删除成功' });
  } catch (err) {
    console.error('[ARTICLES] 删除错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;