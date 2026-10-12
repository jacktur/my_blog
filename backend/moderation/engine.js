const { createHash } = require('node:crypto');
const { splitWindows, signals, vectorize, STRUCTURE } = require('./features');

const sigmoid = (value) => 1 / (1 + Math.exp(-value));
function scoreWindow(window, model) {
  const { vector, coverage } = vectorize(window.text, model);
  const contributions = vector.map((value, i) => ({ feature: model.vocabulary[i] || STRUCTURE[i - model.vocabulary.length], value: value * model.weights[i] }));
  const score = sigmoid(contributions.reduce((sum, entry) => sum + entry.value, 0));
  const context = signals(window.text);
  return { ...window, score, coverage, context,
    features: contributions.filter((entry) => entry.value > 0).sort((a, b) => b.value - a.value).slice(0, 5) };
}

function analyzeArticle(article, model = require('./model.json')) {
  const fields = { title: article.title || '', content: article.content || '', tags: (article.tags || []).join(' ') };
  const windows = Object.entries(fields).flatMap(([field, text]) => splitWindows(text, field)).map((window) => scoreWindow(window, model));
  const sorted = [...windows].sort((a, b) => b.score - a.score);
  const maximum = sorted[0]?.score || 0;
  // Max retains local risk; top-k and prevalence describe its distribution.
  const topMean = sorted.slice(0, 3).reduce((sum, window) => sum + window.score, 0) / Math.min(3, sorted.length || 1);
  const riskyRatio = windows.filter((window) => window.score >= model.thresholds.review).length / (windows.length || 1);
  const combination = windows.some((window) => window.context.combination && !window.context.warning);
  const conflict = windows.some((window) => window.context.combination && window.context.warning);
  const score = Math.max(maximum, combination ? model.thresholds.hold : 0);
  const uncertain = windows.some((window) => window.score >= model.thresholds.review && window.coverage < 0.12);
  let decision = score >= model.thresholds.hold ? 'held' : score >= model.thresholds.review ? 'pending' : 'published';
  if ((conflict || uncertain) && decision === 'published') decision = 'pending';
  const evidence = [];
  for (const window of sorted) {
    if (window.score < model.thresholds.review && !window.context.combination) continue;
    if (evidence.some((other) => other.field === window.field && window.start < other.end && window.end > other.start)) continue;
    evidence.push({ field: window.field, start: window.start, end: window.end, text: window.text,
      score: Number(window.score.toFixed(4)), context: window.context.warning ? 'warning_or_quote' : 'direct_or_uncertain',
      reasons: [window.context.combination ? '收益承诺、招揽话术与联系方式共同出现' : '文本分类模型识别到风险表达',
        ...(window.context.warning ? ['同时出现防范语境，需要结合全文复核'] : [])], features: window.features });
    if (evidence.length === 8) break;
  }
  return { decision, score: Number(score.toFixed(4)), modelVersion: model.version, calibrated: false,
    contentHash: createHash('sha256').update(JSON.stringify(fields)).digest('hex'),
    summary: { maximum, topMean, riskyRatio, windowCount: windows.length, combination, conflict, uncertain }, evidence };
}

module.exports = { analyzeArticle, scoreWindow };
