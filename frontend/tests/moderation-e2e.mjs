import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url));
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'isolated-browser-moderation-test';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const express = backendRequire('express');
const { db, dbGet, dbRun, initDatabase } = backendRequire('./database');
const { generateToken } = backendRequire('./middleware/auth');
const { cases } = backendRequire('./moderation/verify-content');
const baseURL = process.env.MODERATION_UI_URL || 'http://127.0.0.1:5173';
const output = process.env.MODERATION_REPORT_DIR || join(tmpdir(), 'blog-moderation-e2e');
const steps = [];
const check = (name, value) => { assert.ok(value, name); steps.push(name); };
let server, browser;
await mkdir(output, { recursive: true });
try {
  initDatabase();
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (await dbGet("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'record_article_review'")) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(ready, 'Test schema ready');
  for (const [username, role] of [['browser-author', 'user'], ['browser-admin', 'admin']]) await dbRun('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, 'unused', role]);
  const author = await dbGet("SELECT * FROM users WHERE username = 'browser-author'");
  const admin = await dbGet("SELECT * FROM users WHERE username = 'browser-admin'");
  const app = express(); app.use(express.json());
  for (const [mount, module] of [['/articles', 'articles'], ['/articles/:id', 'comments'], ['/users', 'users'], ['/admin', 'admin'], ['/drafts', 'drafts'], ['/series', 'series'], ['/bookmarks', 'bookmarks'], ['/tags', 'tags'], ['/gamification', 'gamification'], ['/notifications', 'notifications'], ['/conversations', 'chat'], ['/follows', 'follows']]) app.use('/api' + mount, backendRequire('./routes/' + module));
  app.use('/api', backendRequire('./routes/progress'));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = async (url, user, method = 'GET', body) => {
    const response = await fetch(origin + '/api' + url, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${generateToken(user)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  // Submit fresh diagnostic cases through the actual publish endpoint.
  const contentResults = [];
  for (const [name, content, needsReview] of cases) {
    const response = await request('/articles', author, 'POST', { title: '内容测试', content });
    assert.equal(response.status, 201);
    const decision = response.body.moderation.decision;
    const publiclyVisible = (await request(`/articles/${response.body.article.id}`)).status === 200;
    check(`${name}: public visibility follows actual moderation status`, publiclyVisible === (decision === 'published'));
    contentResults.push({ name, expected: needsReview ? 'review' : 'published', actual: decision,
      passed: (decision !== 'published') === needsReview, publiclyVisible });
  }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_BROWSER_PATH ? { executablePath: process.env.PLAYWRIGHT_BROWSER_PATH } : {}) });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const errors = [];
    const makePage = async (user) => {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(({ user, token }) => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token', token); }, { user: { id: user.id, username: user.username, role: user.role }, token: generateToken(user) });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      // Forward browser requests to the real isolated Express app, not mock responses.
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: origin + url.pathname + url.search });
        await route.fulfill({ response });
      });
      return page;
    };
    const page = await makePage(author);
    const title = `浏览器审核-${name}`;
    const promotion = '稳赚不赔，立即加入，联系微信 browser456 领取赚钱机会。';
    await page.goto(baseURL + '/create');
    await page.getByPlaceholder('文章标题...').fill(title);
    await page.getByPlaceholder('在此输入 Markdown 内容...').fill(promotion);
    await page.getByRole('button', { name: '发布', exact: true }).click();
    await page.waitForURL('**/article/*');
    await page.getByText(/暂缓发布.*风险分值/).waitFor();
    const id = Number(new URL(page.url()).pathname.split('/').pop());
    check(`${name}: author sees held status`, (await request(`/articles/${id}`, author)).body.article.moderation_status === 'held');
    check(`${name}: anonymous detail is blocked`, (await request(`/articles/${id}`)).status === 404);
    const reviewer = await makePage(admin);
    await reviewer.goto(baseURL + '/admin');
    const entry = reviewer.locator('article').filter({ has: reviewer.getByRole('heading', { name: title, exact: true }) });
    await entry.getByText('查看完整正文', { exact: true }).click();
    await entry.getByRole('textbox', { name: `审核理由 ${id}` }).fill('浏览器测试：确认驳回');
    await reviewer.screenshot({ path: join(output, `${name}-review.png`), fullPage: true });
    check(`${name}: no horizontal overflow`, await reviewer.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await entry.getByRole('button', { name: '驳回', exact: true }).click();
    await entry.waitFor({ state: 'detached' });
    check(`${name}: rejection persisted`, (await request(`/articles/${id}`, author)).body.article.moderation_status === 'rejected');
    await page.reload();
    await page.getByText('复核意见：浏览器测试：确认驳回', { exact: true }).waitFor();
    await page.goto(baseURL + `/edit/${id}`);
    await page.getByPlaceholder('在此输入 Markdown 内容...').fill('今天分享个人博客搭建过程，使用 React 开发页面。');
    await page.getByRole('button', { name: '更新', exact: true }).click();
    await page.waitForURL('**/article/*');
    check(`${name}: edit resubmission automatically publishes normal text`, (await request(`/articles/${id}`)).status === 200);
    // Reintroduce risk, then approve via the same live browser review page.
    await request(`/articles/${id}`, author, 'PUT', { title, content: promotion });
    await reviewer.getByRole('button', { name: '刷新队列' }).click();
    await entry.getByRole('textbox', { name: `审核理由 ${id}` }).fill('浏览器测试：复核通过');
    await entry.getByRole('button', { name: '通过并发布' }).click();
    await entry.waitFor({ state: 'detached' });
    check(`${name}: human approval makes content public`, (await request(`/articles/${id}`)).status === 200);
    check(`${name}: publication reward is not duplicated`, (await dbGet("SELECT COUNT(*) AS count FROM xp_transactions WHERE reference_id = ? AND reason = 'publish_article'", [id])).count === 1);
    check(`${name}: no browser runtime errors`, errors.length === 0);
    await page.context().close(); await reviewer.context().close();
  }
  const report = { at: new Date().toISOString(), isolatedDatabase: true, mockedApi: false, steps,
    contentResults, contentPassed: contentResults.filter((result) => result.passed).length, contentTotal: contentResults.length };
  await writeFile(join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ flowChecksPassed: steps.length, contentPassed: report.contentPassed, contentTotal: report.contentTotal, report: join(output, 'results.json') }));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}
