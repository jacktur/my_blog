const bcrypt = require('bcryptjs');
const { calculateReadTime } = require('../utils/calculateReadTime');

const ROBOT7_ARTICLES = [
  {
    title: 'robot7 的第一篇测试文章',
    likes: 20,
    tags: ['robot7', 'hot'],
    content: `# robot7 的第一篇测试文章

这篇文章用于开发环境验证首页、作者头像、点赞数量和成就状态。

它会被 seed 成 20 个点赞。
`,
  },
  {
    title: 'robot7 的第二篇测试文章',
    likes: 10,
    tags: ['robot7', 'medium'],
    content: `# robot7 的第二篇测试文章

这篇文章用于验证 10 个点赞的文章卡片状态。
`,
  },
  {
    title: 'robot7 的第三篇测试文章',
    likes: 0,
    tags: ['robot7', 'new'],
    content: `# robot7 的第三篇测试文章

这篇文章用于验证 0 点赞文章的初始交互状态。
`,
  },
];

async function ensureUser(dbGet, dbRun, username, password, nickname, avatar = 'default-1', options = {}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
  const role = options.role || 'user';
  const status = options.status || 'active';

  if (existing) {
    await dbRun(
      'UPDATE users SET password = ?, nickname = ?, avatar = ?, role = ?, status = ? WHERE id = ?',
      [hashedPassword, nickname, avatar, role, status, existing.id]
    );
    return existing.id;
  }

  const result = await dbRun(
    `INSERT INTO users (username, password, nickname, avatar, role, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [username, hashedPassword, nickname, avatar, role, status]
  );
  return result.lastID;
}

async function ensureArticle(dbGet, dbRun, userId, article) {
  const existing = await dbGet(
    'SELECT id FROM articles WHERE user_id = ? AND title = ?',
    [userId, article.title]
  );

  if (existing) {
    await dbRun(
      'UPDATE articles SET content = ?, read_time = ?, cover_image = NULL WHERE id = ?',
      [article.content, calculateReadTime(article.content), existing.id]
    );
    return existing.id;
  }

  const result = await dbRun(
    `INSERT INTO articles (title, content, user_id, read_time)
     VALUES (?, ?, ?, ?)`,
    [article.title, article.content, userId, calculateReadTime(article.content)]
  );
  return result.lastID;
}

async function ensureTags(dbGet, dbRun, articleId, tagNames) {
  for (const tagName of tagNames) {
    await dbRun('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tagName]);
    const tag = await dbGet('SELECT id FROM tags WHERE name = ?', [tagName]);
    if (tag) {
      await dbRun(
        'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)',
        [articleId, tag.id]
      );
    }
  }
}

async function ensureLikes(dbGet, dbRun, articleId, likeTarget) {
  const current = await dbGet('SELECT COUNT(*) as count FROM likes WHERE article_id = ?', [articleId]);
  const missing = Math.max(0, likeTarget - current.count);

  for (let i = 1; i <= missing; i += 1) {
    const likerIndex = current.count + i;
    const likerId = await ensureUser(
      dbGet,
      dbRun,
      `robot7_fan_${String(likerIndex).padStart(2, '0')}`,
      '123456',
      `robot7 粉丝 ${likerIndex}`,
      `default-${(likerIndex % 10) + 1}`
    );
    await dbRun(
      'INSERT INTO likes (user_id, article_id, created_at) VALUES (?, ?, ?)',
      [likerId, articleId, `2026-01-01 00:${String(likerIndex).padStart(2, '0')}:00`]
    );
  }
}

async function unlockAchievement(dbGet, dbRun, userId, code) {
  const achievement = await dbGet('SELECT id FROM achievements WHERE code = ?', [code]);
  if (!achievement) return;

  await dbRun(
    `INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [userId, achievement.id]
  );
}

async function seedDevelopmentData({ dbGet, dbRun }) {
  if (process.env.NODE_ENV !== 'development') return;

  await ensureUser(dbGet, dbRun, 'admin', '12345678', '站长', 'default-1', { role: 'admin' });
  const masterId = await ensureUser(dbGet, dbRun, 'master', '123456', 'Master');
  const robot7Id = await ensureUser(dbGet, dbRun, 'robot7', '123456', 'robot7', 'default-7');

  for (const article of ROBOT7_ARTICLES) {
    const articleId = await ensureArticle(dbGet, dbRun, robot7Id, article);
    await ensureTags(dbGet, dbRun, articleId, article.tags);
    await ensureLikes(dbGet, dbRun, articleId, article.likes);
  }

  await unlockAchievement(dbGet, dbRun, masterId, 'first_article');
  await unlockAchievement(dbGet, dbRun, robot7Id, 'first_article');
  await unlockAchievement(dbGet, dbRun, robot7Id, 'first_like_received');

  console.log('[DB] 开发 seed 已同步: admin / 12345678, master / 123456, robot7 / 123456');
}

module.exports = { seedDevelopmentData };
