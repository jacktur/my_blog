const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'isolated-moderation-test-secret';
const express = require('express');
const { db, initDatabase, dbGet, dbRun } = require('../database');
const { generateToken } = require('../middleware/auth');
let server, origin, author, admin, other;
const promotion = '稳赚不赔，立即加入，联系微信 money123 领取赚钱机会。';
async function request(url, { user, method = 'GET', body } = {}) {
  const response = await fetch(origin + '/api' + url, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${generateToken(user)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  await dbRun('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  await dbRun('CREATE TABLE articles (id INTEGER PRIMARY KEY, title TEXT, content TEXT, user_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  await dbRun("INSERT INTO users (id, username, password) VALUES (1, 'legacy', 'unused')");
  await dbRun("INSERT INTO articles (id, title, content, user_id) VALUES (1, '旧文章', '已有正文', 1)");
  initDatabase();
  for (let i = 0; i < 100; i++) {
    const ready = await dbGet("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'record_article_review'");
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  for (const [username, role] of [['author', 'user'], ['reviewer', 'admin'], ['other', 'user']]) await dbRun('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, 'unused', role]);
  author = await dbGet("SELECT * FROM users WHERE username = 'author'");
  admin = await dbGet("SELECT * FROM users WHERE username = 'reviewer'");
  other = await dbGet("SELECT * FROM users WHERE username = 'other'");
  const app = express(); app.use(express.json());
  for (const [mount, module] of [['/articles', 'articles'], ['/articles/:id', 'comments'], ['/users', 'users'], ['/admin', 'admin'], ['/drafts', 'drafts'], ['/series', 'series'], ['/bookmarks', 'bookmarks'], ['/tags', 'tags'], ['/gamification', 'gamification']]) app.use('/api' + mount, require('../routes/' + module));
  app.use('/api', require('../routes/progress'));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test('schema upgrade preserves existing publication without granting rewards again', async () => {
  const article = await dbGet('SELECT * FROM articles WHERE id = 1');
  assert.equal(article.moderation_status, 'published');
  assert.equal(article.publication_rewarded, 1);
  assert.equal(article.content, '已有正文');
  assert.equal((await request('/articles/1')).status, 200);
});

test('failed feedback persistence rolls back review status atomically', async () => {
  const created = await request('/articles', { user: author, method: 'POST', body: { title: '原子复核测试', content: promotion } });
  const id = created.body.article.id;
  await dbRun(`CREATE TRIGGER fail_review_test BEFORE INSERT ON moderation_feedback
    WHEN NEW.reason = 'forced-audit-failure' BEGIN SELECT RAISE(ABORT, 'simulated audit failure'); END`);
  try {
    const result = await request(`/admin/moderation/${id}`, { user: admin, method: 'PATCH', body: { decision: 'published', revision: 1, reason: 'forced-audit-failure' } });
    assert.equal(result.status, 500);
    const article = await dbGet('SELECT moderation_status, moderation_revision FROM articles WHERE id = ?', [id]);
    assert.equal(article.moderation_status, created.body.moderation.decision);
    assert.equal(article.moderation_revision, 1);
    assert.equal((await dbGet('SELECT COUNT(*) AS count FROM moderation_feedback WHERE article_id = ?', [id])).count, 0);
  } finally { await dbRun('DROP TRIGGER fail_review_test'); }
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve, reject) => db.close((err) => err ? reject(err) : resolve()));
});

test('publish and edit are gated; public projections and interactions hide pending content', async () => {
  const created = await request('/articles', { user: author, method: 'POST', body: { title: '审核测试', content: promotion, tags: ['private-only'] } });
  assert.equal(created.status, 201);
  assert.notEqual(created.body.moderation.decision, 'published');
  assert.equal(created.body.gamification, null);
  const id = created.body.article.id;
  assert.equal((await request(`/articles/${id}`)).status, 404);
  assert.equal((await request(`/articles/${id}`, { user: other })).status, 404);
  assert.equal((await request(`/articles/${id}`, { user: author })).status, 200);
  assert.equal((await request(`/articles/${id}`, { user: admin })).status, 200);
  assert.equal((await request(`/articles/${id}/comments`)).status, 404);
  assert.equal((await request(`/articles/${id}/likes`, { method: 'POST', user: other })).status, 404);
  assert.equal((await request('/bookmarks', { method: 'POST', user: other, body: { article_id: id } })).status, 404);
  assert.equal((await request(`/articles/${id}/progress`, { method: 'PUT', user: other, body: { scrollPercentage: 100 } })).status, 404);
  for (const url of ['/articles', '/articles/search?q=审核', `/users/${author.id}/articles`]) assert.ok(!(await request(url)).body.articles.some((article) => article.id === id));
  assert.ok(!(await request('/tags')).body.tags.some((tag) => tag.name === 'private-only'));
  assert.equal((await request('/gamification/achievements', { user: author })).body.achievements.find((achievement) => achievement.code === 'first_article').unlocked, false);
  const series = await request('/series', { user: author, method: 'POST', body: { title: '系列' } });
  await request(`/series/${series.body.series.id}/articles`, { user: author, method: 'POST', body: { article_id: id } });
  assert.equal((await request(`/series/${series.body.series.id}`)).body.articles.length, 0);
  assert.equal((await request('/admin/moderation', { user: other })).status, 403);

  const reviewed = await request(`/admin/moderation/${id}`, { user: admin, method: 'PATCH', body: { decision: 'published', revision: 1, reason: '人工复核正常' } });
  assert.equal(reviewed.status, 200);
  assert.equal((await request(`/articles/${id}`)).status, 200);
  assert.equal((await dbGet('SELECT COUNT(*) AS count FROM moderation_feedback WHERE article_id = ?', [id])).count, 1);
  assert.equal((await dbGet("SELECT COUNT(*) AS count FROM xp_transactions WHERE reason = 'publish_article' AND reference_id = ?", [id])).count, 1);
  assert.equal((await request(`/admin/moderation/${id}`, { user: admin, method: 'PATCH', body: { decision: 'published', revision: 1, reason: '重复审核' } })).status, 409);

  assert.equal((await request(`/articles/${id}`, { user: author, method: 'PUT', body: { title: '修改后的文章', content: promotion } })).status, 200);
  assert.equal((await request(`/articles/${id}`)).status, 404);
  const current = (await request(`/articles/${id}`, { user: author })).body.article;
  const row = await dbGet('SELECT moderation_revision FROM articles WHERE id = ?', [id]);
  assert.notEqual(current.moderation_status, 'published');
  const results = await Promise.all(['published', 'rejected'].map((decision) => request(`/admin/moderation/${id}`, { user: admin, method: 'PATCH', body: { decision, revision: row.moderation_revision, reason: '并发复核' } })));
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await dbGet("SELECT COUNT(*) AS count FROM xp_transactions WHERE reason = 'publish_article' AND reference_id = ?", [id])).count, 1);
});

test('draft publication, rejection/resubmission and feedback export', async () => {
  const draft = await request('/drafts', { user: author, method: 'POST', body: { title: '草稿审核', content: promotion } });
  const result = await request(`/drafts/${draft.body.draft.id}/publish`, { user: author, method: 'POST' });
  assert.equal(result.status, 201);
  const id = result.body.article.id;
  assert.notEqual(result.body.moderation.decision, 'published');
  assert.equal((await request(`/articles/${id}`)).status, 404);
  assert.equal((await request(`/admin/moderation/${id}`, { user: admin, method: 'PATCH', body: { decision: 'rejected', revision: 1, reason: '违规广告' } })).status, 200);
  assert.equal((await request(`/articles/${id}`, { user: author })).body.article.moderation_status, 'rejected');
  const updated = await request(`/articles/${id}`, { user: author, method: 'PUT', body: { title: '技术笔记', content: '今天分享个人博客搭建过程，使用 React 开发页面。' } });
  assert.equal(updated.body.moderation.decision, 'published');
  assert.equal((await request(`/articles/${id}`)).status, 200);
  const exported = await request('/admin/moderation/feedback/export', { user: admin });
  assert.ok(exported.body.samples.some((sample) => sample.article_id === id && sample.label === 1 && JSON.parse(sample.snapshot_json).content === promotion));
});

test('normal publication awards once; malformed submissions do not reach classifier', async () => {
  const invalid = await request('/articles', { user: author, method: 'POST', body: { title: ' ', content: '正文', tags: [null] } });
  assert.equal(invalid.status, 400);
  const result = await request('/articles', { user: author, method: 'POST', body: { title: '开发笔记', content: '今天分享个人博客搭建过程，使用 React 开发页面。' } });
  assert.equal(result.body.moderation.decision, 'published');
  assert.ok(result.body.gamification);
  assert.ok((await request('/articles/mine/submissions', { user: author })).body.articles.some((article) => article.id === result.body.article.id));
});
