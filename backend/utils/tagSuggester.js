/**
 * 智能标签推荐算法
 * 基于词频 + 标题加权 + 标题邻近度的纯 JS 实现（无需 ML）
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'it', 'its',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they',
  'them', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again',
  'being', 'below', 'between', 'through', 'during', 'before', 'after', 'up', 'down',
  'out', 'off', 'over', 'under', 'here', 'there', 'then', 'once', 'also', 'well',
  'if', 'because', 'while', 'since', 'until', 'although', 'though', 'yet', 'still',
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '怎么', '因为', '所以',
  '但是', '可以', '这个', '那个', '时候', '已经', '如果', '虽然', '而且', '然后',
  '因为', '所以', '但是', '可以', '已经', '没有', '什么', '怎么', '时候', '自己',
]);

function tokenize(text) {
  if (!text) return [];
  // 匹配中文、英文单词
  const tokens = text.toLowerCase().match(/[一-龥a-z0-9]+/gi) || [];
  return tokens.filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

/**
 * 从文章内容推荐标签
 * @param {string} title - 文章标题
 * @param {string} content - 文章内容（Markdown）
 * @param {Array} existingTags - 已存在的标签列表 [{ name, article_count }]
 * @param {number} maxSuggestions - 最大推荐数（默认5）
 * @returns {Array} 推荐标签 [{ name, score }]
 */
function suggestTags(title, content, existingTags, maxSuggestions = 5) {
  if (!existingTags || existingTags.length === 0) return [];

  // 1. 分词
  const titleTokens = tokenize(title);
  const contentTokens = tokenize(content);
  const contentText = (content || '').toLowerCase();

  // 2. 词频统计（从内容中）
  const wordFreq = {};
  for (const token of contentTokens) {
    wordFreq[token] = (wordFreq[token] || 0) + 1;
  }

  // 3. 计算已存在标签的评分
  const scored = existingTags.map((tag) => {
    const tagName = tag.name.toLowerCase();
    let score = 0;

    // 标题匹配：+5
    if (titleTokens.includes(tagName)) {
      score += 5;
    }

    // 标题中的部分匹配：+2
    if (titleTokens.some(t => tagName.includes(t) || t.includes(tagName))) {
      score += 2;
    }

    // 内容词频：每个出现 +1，上限5
    const freq = wordFreq[tagName] || 0;
    score += Math.min(freq, 5);

    // 内容中的部分匹配
    for (const token of contentTokens) {
      if (token.includes(tagName) && token !== tagName) {
        score += 0.5;
      }
    }

    return { name: tag.name, score: Math.round(score * 10) / 10 };
  });

  // 4. 过滤低分，按分数降序排列
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}

/**
 * 基于内容自动摘要提取（抽取式）
 * @param {string} content - Markdown 内容
 * @param {number} maxSentences - 最多句子数（默认4）
 * @returns {string} 摘要
 */
function extractSummary(content, maxSentences = 4) {
  if (!content || content.length < 50) return '';

  // 1. 清洗 - 去除代码块和 Markdown 标记
  const cleaned = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~]/g, '')
    .replace(/>\s?/g, '')
    .trim();

  // 2. 分句（支持中文句号、感叹号、问号、英文句点）
  const sentences = cleaned
    .split(/(?<=[。！？.!?\n])\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length <= maxSentences) return sentences.join(' ');

  // 3. 词频统计
  const words = tokenize(cleaned);
  const wordFreq = {};
  for (const w of words) wordFreq[w] = (wordFreq[w] || 0) + 1;

  // 4. 句子评分
  const scored = sentences.map((sentence, i) => {
    const sentenceLower = sentence.toLowerCase();
    let score = 0;

    // 词频得分
    const tokens = tokenize(sentence);
    for (const t of tokens) {
      score += wordFreq[t] || 0;
    }
    // 归一化
    if (tokens.length > 0) score = score / tokens.length;

    // 位置偏置：前3句 +2，最后1句 +1
    if (i < 3) score += 2;
    if (i === sentences.length - 1) score += 1;

    // 长度惩罚：过短或过长
    if (tokens.length < 5) score *= 0.5;
    if (tokens.length > 30) score *= 0.8;

    return { sentence, score, index: i };
  });

  // 5. 选 Top N 句，按原文顺序排列
  const topSentences = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence);

  return topSentences.join(' ');
}

module.exports = { suggestTags, extractSummary };
