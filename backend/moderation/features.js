const WINDOW_SIZE = 360;
const OVERLAP = 60;
const STRUCTURE = ['bias', 'promise', 'solicit', 'contact', 'combination', 'warning', 'obfuscation', 'links', 'repetition'];
const PATTERNS = {
  promise: /稳赚不赔|保证收益|保证高收益|日赚\d+|躺赚|包赚|百分百赚钱|无风险投资/gu,
  solicit: /立即加入|加我|私聊|领取福利|扫码加入|联系领取|点击购买|限时抢购|进群|添加微信/gu,
  contact: /(?:微信|vx|v信|qq|电话|联系)\s*[:：]?\s*[a-z\d_-]{4,}|https?:\/\/\S+/giu,
  warning: /警惕|不要相信|谨防|识别骗局|防范|反诈|揭露|不要加入|勿信/gu,
};

function normalize(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/[\u200b-\u200f\u2060\ufeff]/g, '');
}

function ngrams(text) {
  const counts = new Map();
  // Punctuation remains a boundary; never join unrelated sentences.
  for (const run of normalize(text).match(/[\p{L}\p{N}]+/gu) || []) {
    const chars = Array.from(run);
    for (const n of [2, 3]) {
      for (let i = 0; i <= chars.length - n; i++) {
        const term = chars.slice(i, i + n).join('');
        counts.set(term, (counts.get(term) || 0) + 1);
      }
    }
  }
  return counts;
}

function signals(raw) {
  const text = normalize(raw);
  // Only allow short separators between CJK characters for the auxiliary rules.
  const compact = text.replace(/(?<=[\u4e00-\u9fff])[ .·_*\-]{1,2}(?=[\u4e00-\u9fff])/g, '');
  const count = (key) => [...compact.matchAll(PATTERNS[key])].length;
  const promise = Math.min(3, count('promise')) / 3;
  const solicit = Math.min(3, count('solicit')) / 3;
  const contact = Math.min(3, count('contact')) / 3;
  const warning = Math.min(3, count('warning')) / 3;
  const combination = promise > 0 && solicit > 0 && contact > 0;
  const repeat = [...ngrams(text).values()].filter((value) => value > 5).length;
  const values = [1, promise, solicit, contact, Number(combination), warning,
    Math.min(1, (raw.match(/[\u200b-\u200f\u2060\ufeff]|(?<=[\u4e00-\u9fff])[ .·_*\-](?=[\u4e00-\u9fff])/g) || []).length / 5),
    Math.min(1, (text.match(/https?:\/\//g) || []).length / 5), Math.min(1, repeat / 10)];
  return { values, combination, warning: warning > 0, promise: promise > 0, solicit: solicit > 0 };
}

function splitWindows(text, field = 'content') {
  const windows = [];
  for (const match of text.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g)) {
    for (let local = 0; local < match[0].length; local += WINDOW_SIZE - OVERLAP) {
      const end = Math.min(match[0].length, local + WINDOW_SIZE);
      windows.push({ field, start: match.index + local, end: match.index + end,
        text: match[0].slice(local, end) });
      if (end === match[0].length) break;
    }
  }
  return windows;
}

function fitVocabulary(texts, limit = 512) {
  const frequency = new Map();
  for (const text of texts) for (const term of ngrams(text).keys()) frequency.set(term, (frequency.get(term) || 0) + 1);
  const vocabulary = [...frequency].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([term]) => term);
  const idf = vocabulary.map((term) => Math.log((1 + texts.length) / (1 + frequency.get(term))) + 1);
  return { vocabulary, idf };
}

function vectorize(text, model) {
  const counts = ngrams(text);
  const tfidf = model.vocabulary.map((term, i) => (counts.has(term) ? 1 + Math.log(counts.get(term)) : 0) * model.idf[i]);
  const norm = Math.sqrt(tfidf.reduce((sum, value) => sum + value * value, 0)) || 1;
  const coverage = [...counts.keys()].filter((term) => model.vocabulary.includes(term)).length / Math.max(1, counts.size);
  return { vector: [...tfidf.map((value) => value / norm), ...signals(text).values], coverage };
}

module.exports = { normalize, ngrams, signals, splitWindows, fitVocabulary, vectorize, STRUCTURE };
