const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { calculateReadTime } = require('../utils/calculateReadTime');
const { validateArticle, moderationMessage, rewardPublication, analyzeArticle } = require('../moderation/service');

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

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * GET /api/articles
 * 获取文章列表
 * 支持 ?tag=xxx 按标签筛选（无需登录）
 * 支持 ?scope=following 获取关注作者的文章（需登录）
 * 支持 ?sort=hot 按互动热度排序
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
    const { tag, scope, sort } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = sort === 'hot'
      ? 'ORDER BY (like_count * 3 + comment_count * 2 + COALESCE(articles.view_count, 0)) DESC, articles.created_at DESC'
      : 'ORDER BY articles.created_at DESC';

    let sql;
    let params = [];

    if (scope === 'following') {
      // req.user 由 authenticateToken 中间件注入
      const userId = req.user.id;

      sql = `SELECT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image, articles.view_count,
              articles.user_id,
              users.username, users.nickname, users.avatar,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id AND comments.deleted_at IS NULL) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       WHERE articles.user_id IN (
         SELECT following_id FROM follows WHERE follower_id = ?
       )
         AND articles.deleted_at IS NULL AND articles.moderation_status = 'published'
       ${orderBy}
       LIMIT ? OFFSET ?`;
      params = [userId, limit, offset];
    } else if (tag) {
      sql = `SELECT DISTINCT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image, articles.view_count,
              articles.user_id,
              users.username, users.nickname, users.avatar,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id AND comments.deleted_at IS NULL) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       JOIN article_tags ON articles.id = article_tags.article_id
       JOIN tags ON article_tags.tag_id = tags.id
       WHERE tags.name = ? AND articles.deleted_at IS NULL AND articles.moderation_status = 'published'
       ${orderBy}
       LIMIT ? OFFSET ?`;
      params = [tag.toLowerCase().trim(), limit, offset];
    } else {
      sql = `SELECT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image, articles.view_count,
              articles.user_id,
              users.username, users.nickname, users.avatar,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id AND comments.deleted_at IS NULL) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       WHERE articles.deleted_at IS NULL AND articles.moderation_status = 'published'
       ${orderBy}
       LIMIT ? OFFSET ?`;
      params = [limit, offset];
    }

    const articles = await dbAll(sql, params);

    // 为每篇文章获取标签
    const articlesWithTags = await Promise.all(
      articles.map(async (article) => {
        const tags = await getArticleTags(article.id);
        return { ...article, tags };
      })
    );

    res.json({ articles: articlesWithTags, pagination: { page, limit, hasMore: articles.length === limit } });
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
    const { q, tag, author, sort } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }

    const keyword = `%${q.trim()}%`;
    const where = ['articles.deleted_at IS NULL', "articles.moderation_status = 'published'", '(articles.title LIKE ? OR articles.content LIKE ?)'];
    const params = [keyword, keyword];
    if (tag) {
      where.push('tags.name = ?');
      params.push(tag.toLowerCase().trim());
    }
    if (author) {
      where.push('(users.username LIKE ? OR users.nickname LIKE ?)');
      params.push(`%${author.trim()}%`, `%${author.trim()}%`);
    }
    const orderBy = sort === 'hot'
      ? 'ORDER BY (like_count * 3 + comment_count * 2 + COALESCE(articles.view_count, 0)) DESC, articles.created_at DESC'
      : 'ORDER BY articles.created_at DESC';

    const articles = await dbAll(
      `SELECT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at, articles.read_time, articles.cover_image, articles.view_count,
              articles.user_id,
              users.username, users.nickname, users.avatar,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id AND comments.deleted_at IS NULL) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       LEFT JOIN article_tags ON articles.id = article_tags.article_id
       LEFT JOIN tags ON article_tags.tag_id = tags.id
       WHERE ${where.join(' AND ')}
       GROUP BY articles.id
       ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 获取每篇文章的标签
    const articlesWithTags = await Promise.all(
      articles.map(async (article) => {
        const tags = await getArticleTags(article.id);
        return { ...article, tags };
      })
    );

    res.json({ articles: articlesWithTags, query: q.trim(), pagination: { page, limit, hasMore: articles.length === limit } });
  } catch (err) {
    console.error('[ARTICLES] 搜索错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/articles/:id
 * 获取单篇文章详情（无需登录）
 */
router.get('/mine/submissions', authenticateToken, async (req, res) => {
  try {
    const articles = await dbAll(`SELECT id, title, moderation_status, moderation_revision, moderation_json, created_at
      FROM articles WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
    res.json({ articles: articles.map((article) => ({ ...article, moderation: JSON.parse(article.moderation_json || 'null'), moderation_json: undefined })) });
  } catch (err) { res.status(500).json({ error: '加载投稿失败' }); }
});

router.get('/:id', (req, res, next) => {
  if (req.headers.authorization) return authenticateToken(req, res, next);
  next();
}, async (req, res) => {
  try {
    const { id } = req.params;

    const article = await dbGet(
      `SELECT articles.id, articles.title, articles.content,
              articles.created_at, articles.read_time, articles.cover_image, articles.view_count,
              articles.moderation_status, articles.moderation_json,
              articles.user_id, users.username, users.nickname, users.avatar
       FROM articles
       JOIN users ON articles.user_id = users.id
       WHERE articles.id = ? AND articles.deleted_at IS NULL`,
      [id]
    );

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const privileged = req.user?.id === article.user_id || req.user?.role === 'admin';
    if (article.moderation_status !== 'published' && !privileged) return res.status(404).json({ error: '文章不存在' });
    article.moderation = privileged ? JSON.parse(article.moderation_json || 'null') : undefined;
    delete article.moderation_json;

    // 获取标签
    const tags = await getArticleTags(article.id);

    // 浏览计数递增（基于 IP 去重，每24h 同一 IP 只计一次）
    const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const existingView = await dbGet(
      "SELECT id FROM article_views WHERE article_id = ? AND ip = ? AND date(viewed_at) = date('now')",
      [id, clientIp]
    );
    if (!existingView && article.moderation_status === 'published') {
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

    const validationError = validateArticle(title, content, tags);
    if (validationError) return res.status(400).json({ error: validationError });

    const safeTitle = sanitizeInput(title);
    // Markdown 内容保留原始格式，不做 HTML 转义（前端渲染时用 DOMPurify 清洗）
    const userId = req.user.id;
    const readTime = calculateReadTime(content);
    const moderation = analyzeArticle({ title: safeTitle, content, tags });

    const result = await dbRun(
      'INSERT INTO articles (title, content, user_id, read_time, cover_image, moderation_status, moderation_json, moderation_revision, publication_rewarded) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)',
      [safeTitle, content, userId, readTime, req.body.cover_image || null, moderation.decision, JSON.stringify(moderation)]
    );

    // 设置标签
    if (tags && Array.isArray(tags)) {
      await setArticleTags(result.lastID, tags);
    }

    const articleTags = await getArticleTags(result.lastID);

    const gamification = await rewardPublication(result.lastID);

    res.status(201).json({
      message: moderationMessage(moderation.decision), moderation,
      article: { id: result.lastID, title: safeTitle, user_id: userId, tags: articleTags, moderation_status: moderation.decision },
      gamification
    });
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
      'SELECT id, user_id FROM articles WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    if (article.user_id !== userId) {
      return res.status(403).json({ error: '无权修改此文章' });
    }

    const validationError = validateArticle(title, content, tags);
    if (validationError) return res.status(400).json({ error: validationError });

    const safeTitle = sanitizeInput(title);
    const readTime = calculateReadTime(content);
    const effectiveTags = tags === undefined ? (await getArticleTags(id)).map((tag) => tag.name) : tags;
    const moderation = analyzeArticle({ title: safeTitle, content, tags: effectiveTags });

    await dbRun(
      'UPDATE articles SET title = ?, content = ?, read_time = ?, cover_image = COALESCE(?, cover_image), moderation_status = ?, moderation_json = ?, moderation_revision = moderation_revision + 1 WHERE id = ? AND deleted_at IS NULL',
      [safeTitle, content, readTime, req.body.cover_image || null, moderation.decision, JSON.stringify(moderation), id]
    );

    // 更新标签
    if (tags && Array.isArray(tags)) {
      await setArticleTags(id, tags);
    }

    const gamification = await rewardPublication(id);
    res.json({ message: moderationMessage(moderation.decision), moderation, gamification });
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
