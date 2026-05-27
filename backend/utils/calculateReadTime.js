/**
 * 计算 Markdown 文本的阅读时间（分钟）
 * 基于中文/英文混合计数：中文约 300 字/分钟，英文约 200 词/分钟
 */
function calculateReadTime(markdown) {
  if (!markdown || typeof markdown !== 'string') return 0;

  // 去除 Markdown 标记
  const text = markdown
    .replace(/```[\s\S]*?```/g, '')     // 移除代码块
    .replace(/`[^`]+`/g, '')              // 移除行内代码
    .replace(/!\[.*?\]\(.*?\)/g, '')      // 移除图片
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // 保留链接文字
    .replace(/#{1,6}\s/g, '')             // 移除标题标记
    .replace(/[*_~`]/g, '')               // 移除强调标记
    .replace(/>\s/g, '')                  // 移除引用标记
    .replace(/\n\s*\n/g, '\n')            // 压缩空行
    .trim();

  // 统计中文字数
  const chineseChars = (text.match(/[一-龥]/g) || []).length;

  // 统计英文单词数（去除中文后的纯英文文本）
  const englishText = text.replace(/[一-龥]/g, ' ');
  const englishWords = englishText
    .split(/\s+/)
    .filter(w => w.length > 0 && /[a-zA-Z0-9]/.test(w))
    .length;

  // 中文阅读时间（300 字/分钟）+ 英文阅读时间（200 词/分钟）
  const minutes = Math.ceil(chineseChars / 300 + englishWords / 200);

  return Math.max(1, minutes);
}

module.exports = { calculateReadTime };
