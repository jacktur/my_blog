import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const { analyzeArticle } = require('../../backend/moderation/engine');
const output = join(tmpdir(), 'blog-moderation-ui');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_BROWSER_PATH ? { executablePath: process.env.PLAYWRIGHT_BROWSER_PATH } : {}) });
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const content = '稳赚不赔，立即加入，联系微信 money123 领取赚钱机会。';
    const article = { id: 99, title: '审核演示文章', content, moderation_status: 'pending', moderation_revision: 1,
      moderation: analyzeArticle({ content }), username: 'demo', nickname: '演示作者' };
    let payload;
    await page.addInitScript(() => {
      localStorage.setItem('token', 'ui-test');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'admin', username: 'reviewer' }));
    });
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      let result = { users: [], articles: [], comments: [], messages: [], reports: [], actions: [], notifications: [], unreadCount: 0, summary: {} };
      if (url.pathname === '/api/admin/moderation') result = { articles: article.moderation_status === 'pending' ? [article] : [] };
      if (route.request().method() === 'PATCH') { payload = route.request().postDataJSON(); article.moderation_status = payload.decision; }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
    });
    await page.goto('http://127.0.0.1:5173/admin');
    await page.getByText('审核演示文章', { exact: true }).waitFor();
    await page.getByText('查看完整正文', { exact: true }).click();
    assert.ok(await page.getByText(content, { exact: true }).count());
    await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${name}: horizontal overflow`);
    await page.getByRole('textbox', { name: '审核理由 99' }).fill('人工确认正常');
    await page.getByRole('button', { name: '通过并发布' }).click();
    await page.getByText('暂无此状态的文章', { exact: true }).waitFor();
    assert.deepEqual(payload, { decision: 'published', revision: 1, reason: '人工确认正常' });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`Desktop/mobile moderation UI passed. Screenshots: ${output}`);
} finally { await browser.close(); }
