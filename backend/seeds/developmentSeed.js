const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const { calculateReadTime } = require('../utils/calculateReadTime');

const ARTICLE_SEED_DIR = path.join(__dirname, 'articles');
const ARTICLE_MANIFEST_PATH = path.join(ARTICLE_SEED_DIR, 'manifest.json');

/*
 * 开发环境文章正文拆分到 backend/seeds/articles/*.md，元数据放在 manifest.json：
 * - 避免 developmentSeed.js 随测试文章增多而变成难维护的大文件。
 * - 新增测试文章时，复制一个 Markdown 文件，并在 manifest.json 添加 file/title/tags/likes。
 * - 如果要替换已有测试文章标题，给 manifest 项增加 matchTitle 指向旧标题，避免重复插入。
 * - 日常理解 Seed 结构优先看本文件和 manifest.json，不需要打开所有长篇 Markdown。
 * - 重新执行 Seed：以 NODE_ENV=development 启动后端，或重启开发后端触发 seedDevelopmentData。
 */
function validateArticleSeedMeta(item, index) {
  const label = `articles manifest 第 ${index + 1} 项`;
  if (!item || typeof item !== 'object') throw new Error(`${label} 不合法`);
  if (!item.file || typeof item.file !== 'string' || !item.file.endsWith('.md')) {
    throw new Error(`${label} 缺少合法 file`);
  }
  if (item.file.includes('/') || item.file.includes('\\')) {
    throw new Error(`${label} 的 file 只能是文件名`);
  }
  if (!item.title || typeof item.title !== 'string') throw new Error(`${label} 缺少 title`);

  return {
    file: item.file,
    title: item.title,
    matchTitle: typeof item.matchTitle === 'string' && item.matchTitle.trim() ? item.matchTitle.trim() : item.title,
    likes: Number(item.likes || 0),
    tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()) : [],
  };
}

async function loadArticleSeeds() {
  const manifestContent = await fs.readFile(ARTICLE_MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestContent);
  if (!Array.isArray(manifest)) throw new Error('articles manifest 必须是数组');

  const articles = [];
  for (const [index, item] of manifest.entries()) {
    const meta = validateArticleSeedMeta(item, index);
    const fullPath = path.join(ARTICLE_SEED_DIR, meta.file);
    const markdown = await fs.readFile(fullPath, 'utf8');
    articles.push({ ...meta, content: markdown.trimStart() });
  }
  return articles;
}

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
    'SELECT id FROM articles WHERE user_id = ? AND title IN (?, ?)',
    [userId, article.title, article.matchTitle || article.title]
  );

  if (existing) {
    await dbRun(
      'UPDATE articles SET title = ?, content = ?, read_time = ?, cover_image = NULL WHERE id = ?',
      [article.title, article.content, calculateReadTime(article.content), existing.id]
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
  const robot7Articles = await loadArticleSeeds();

  for (const article of robot7Articles) {
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
