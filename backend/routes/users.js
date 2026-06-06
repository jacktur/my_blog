const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  let cleaned = input.trim();
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  return cleaned;
}

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  const cleaned = sanitizeInput(value);
  return cleaned || null;
}

const VALID_AVATARS = [
  'default-1','default-2','default-3','default-4',
  'default-5','default-6','default-7','default-8',
  'default-9','default-10'
];

/**
 * GET /api/users/avatars/defaults
 * 获取默认头像列表（必须在 /:id 之前注册）
 */
router.get('/avatars/defaults', (req, res) => {
  const avatars = VALID_AVATARS.map((name, index) => ({
    id: name,
    url: `/uploads/avatars/defaults/${name}.svg`,
    label: `默认头像 ${index + 1}`
  }));
  res.json({ avatars });
});

/**
 * GET /api/users/profile
 * 获取当前登录用户的完整资料
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      `SELECT id, username, nickname, email, birthday, bio, avatar, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ user });
  } catch (err) {
    console.error('[USERS] 获取个人资料错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/users/:id
 * 获取用户公开资料
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    
    const user = await dbGet(

      `SELECT id, username, nickname, email, birthday, bio, avatar, created_at

       FROM users WHERE id = ?`,

      [id]

    );




    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (err) {
    console.error('[USERS] 获取用户资料错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * PUT /api/users/profile
 * 更新个人资料（需登录）
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nickname, email, birthday, bio, avatar } = req.body;

    const safeNickname = normalizeOptionalString(nickname);
    const safeEmail = normalizeOptionalString(email);
    const safeBirthday = normalizeOptionalString(birthday);
    const safeBio = normalizeOptionalString(bio);
    const safeAvatar = normalizeOptionalString(avatar);

    if (safeNickname && (safeNickname.length < 1 || safeNickname.length > 30)) {
      return res.status(400).json({ error: '昵称长度需在 1-30 个字符之间' });
    }

    if (safeEmail && safeEmail.length > 100) {
      return res.status(400).json({ error: '邮箱地址过长' });
    }

    if (safeBio && safeBio.length > 200) {
      return res.status(400).json({ error: '个性签名不能超过200个字符' });
    }

    if (safeAvatar && !VALID_AVATARS.includes(safeAvatar) && !safeAvatar.startsWith('custom/')) {
      return res.status(400).json({ error: '无效的头像选择' });
    }

    const allowedFields = {
      nickname: safeNickname,
      email: safeEmail,
      birthday: safeBirthday,
      bio: safeBio,
      avatar: safeAvatar,
    };
    const updates = Object.entries(allowedFields).filter(([field]) =>
      Object.prototype.hasOwnProperty.call(req.body, field)
    );

    if (updates.length > 0) {
      await dbRun(
        `UPDATE users SET ${updates.map(([field]) => `${field} = ?`).join(', ')} WHERE id = ?`,
        [...updates.map(([, value]) => value), userId]
      );
    }

    const updated = await dbGet(
      `SELECT id, username, nickname, email, birthday, bio, avatar, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    res.json({ message: '资料更新成功', user: updated });
  } catch (err) {
    console.error('[USERS] 更新资料错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/users/:id/articles
 * 获取用户的文章列表
 */
router.get('/:id/articles', async (req, res) => {
  try {
    const { id } = req.params;

    const articles = await dbAll(
      `SELECT articles.id, articles.title,
              substr(articles.content, 1, 200) as excerpt,
              articles.created_at,
              articles.user_id,
              users.username, users.nickname,
              (SELECT COUNT(*) FROM comments WHERE comments.article_id = articles.id) as comment_count,
              (SELECT COUNT(*) FROM likes WHERE likes.article_id = articles.id) as like_count
       FROM articles
       JOIN users ON articles.user_id = users.id
       WHERE articles.user_id = ?
       ORDER BY articles.created_at DESC`,
      [id]
    );

    // 获取每篇文章的标签
    const { dbAll: dbAllTags } = require('../database');
    async function getArticleTags(articleId) {
      return dbAllTags(
        `SELECT tags.id, tags.name
         FROM tags
         JOIN article_tags ON tags.id = article_tags.tag_id
         WHERE article_tags.article_id = ?
         ORDER BY tags.name ASC`,
        [articleId]
      );
    }

    const articlesWithTags = await Promise.all(
      articles.map(async (article) => {
        const tags = await getArticleTags(article.id);
        return { ...article, tags };
      })
    );

    res.json({ articles: articlesWithTags });
  } catch (err) {
    console.error('[USERS] 获取用户文章列表错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/users/:id/stats
 * 获取用户的统计数据
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await dbGet('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const articleCount = await dbGet(
      'SELECT COUNT(*) as count FROM articles WHERE user_id = ?',
      [id]
    );

    const totalLikes = await dbGet(
      `SELECT COUNT(*) as count FROM likes
       WHERE article_id IN (SELECT id FROM articles WHERE user_id = ?)`,
      [id]
    );

    const totalComments = await dbGet(
      `SELECT COUNT(*) as count FROM comments
       WHERE article_id IN (SELECT id FROM articles WHERE user_id = ?)`,
      [id]
    );

    res.json({
      stats: {
        articleCount: articleCount.count,
        totalLikes: totalLikes.count,
        totalComments: totalComments.count,
      }
    });
  } catch (err) {
    console.error('[USERS] 获取用户统计错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
