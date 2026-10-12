const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeArticle } = require('../moderation/engine');
const { normalize, splitWindows, ngrams } = require('../moderation/features');
const { validateDataset } = require('../moderation/train');

test('normal text, contact details and cautionary prose are not keyword-blocked', () => {
  for (const content of ['今天分享个人博客搭建过程，使用 React 开发页面。',
    '有问题可以联系微信 developer123，我们一起讨论代码。',
    '不要相信稳赚不赔的宣传，投资存在风险，谨防骗局。']) {
    assert.equal(analyzeArticle({ content }).decision, 'published', content);
  }
});

test('a localized promotion survives long normal content and produces original offsets', () => {
  const content = '今天分享个人博客搭建过程，使用 React 开发页面。\n\n'.repeat(60)
    + '稳赚不赔，立即加入，联系微信 money123 领取赚钱机会。';
  const result = analyzeArticle({ title: '技术笔记', content });
  assert.notEqual(result.decision, 'published');
  assert.ok(result.evidence.some((item) => item.text.includes('money123')));
  for (const item of result.evidence.filter((item) => item.field === 'content')) assert.equal(content.slice(item.start, item.end), item.text);
  assert.ok(result.summary.riskyRatio < 0.1);
});

test('normalization, short separators and title/tag risk cannot bypass review', () => {
  assert.equal(normalize('ＡＢＣ\u200b'), 'abc');
  for (const content of ['稳\u200b赚不赔，立即加入，添加微信 bonus123。', '稳.赚.不.赔，立即加入，微信 money456。']) assert.notEqual(analyzeArticle({ content }).decision, 'published');
  for (const field of ['title', 'tags']) {
    const text = '稳赚不赔，立即加入，微信 money123';
    assert.notEqual(analyzeArticle({ content: '普通技术文章', [field]: field === 'tags' ? [text] : text }).decision, 'published');
  }
  assert.equal(ngrams('保证。收益').has('证收'), false);
});

test('warning phrases are not a global whitelist', () => {
  assert.notEqual(analyzeArticle({ content: '谨防诈骗\n\n稳赚不赔，立即加入，微信 money123' }).decision, 'published');
  const content = '技术笔记'.repeat(300);
  for (const item of splitWindows(content)) assert.equal(content.slice(item.start, item.end), item.text);
});

test('training rejects duplicate labels across dataset splits', () => {
  assert.throws(() => validateDataset([{ text: '重复内容', label: 0, split: 'train' }, { text: '重复内容', label: 1, split: 'test' }]), /Duplicate/);
});
