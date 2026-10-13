const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeArticle } = require('../moderation/engine');
const { normalize, splitWindows, ngrams } = require('../moderation/features');
const { validateDataset } = require('../moderation/train');
const { detectAttack } = require('../moderation/attack');

test('direct attacks receive a high-risk floor with an explicit explanation', () => {
  for (const content of ['你这个垃圾废物，去死吧。', '你就是个蠢货。', '去死吧。', '你这个垃.圾废\u200b物。']) {
    const result = analyzeArticle({ content });
    assert.equal(result.decision, 'held', content);
    assert.ok(result.score >= 0.9);
    assert.ok(result.evidence.some(item => item.reasons.some(reason => reason.includes('人身攻击'))));
    assert.equal(result.calibrated, false);
  }
  for (const field of ['title', 'tags']) {
    const result = analyzeArticle({ content: '普通技术记录', [field]: field === 'tags' ? ['你这个废物'] : '你这个废物' });
    assert.equal(result.decision, 'held');
  }
  const long = analyzeArticle({ content: '普通技术记录。\n\n'.repeat(100) + '你这个废物，去死吧。' });
  assert.equal(long.decision, 'held');
});

test('attack rules do not treat object descriptions or explicit reporting as direct attacks', () => {
  for (const content of ['这个垃圾文件需要清理。', '这个废物回收项目由他负责。',
    '报道记录有人辱骂他人：你这个垃圾废物，去死吧。我们反对人身攻击。',
    '不要对别人说你这个废物，去死吧。',
    '引用原话：“你这个垃圾废物，去死吧。”我们反对辱骂。']) {
    assert.equal(detectAttack(content).direct, false, content);
  }
  assert.equal(detectAttack('引用原话：“你这个废物。”你这个垃圾，去死吧。').direct, true);
  assert.equal(detectAttack('反对人身攻击。\n\n你这个废物，去死吧。').direct, true);
});

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
