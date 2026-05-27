/**
 * 增强代码块：从渲染后的 HTML 中识别代码块并返回处理数据
 */
export function parseCodeBlocks(html) {
  const blocks = [];
  const preRegex = /<pre><code(?:\s+class="[^"]*language-(\w+)[^"]*")?>([\s\S]*?)<\/code><\/pre>/gi;
  let match;

  while ((match = preRegex.exec(html)) !== null) {
    const language = match[1] || 'text';
    const code = decodeHtmlEntities(match[2]);
    blocks.push({ language, code, index: match.index });
  }

  return blocks;
}

/**
 * 分割 HTML，将普通部分和代码块部分分开
 */
export function splitHtmlAtCodeBlocks(html) {
  const parts = [];
  const regex = /(<pre><code(?:\s+class="[^"]*language-\w+[^"]*")?>[\s\S]*?<\/code><\/pre>)/gi;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    // 代码块前的普通 HTML
    if (match.index > lastIndex) {
      parts.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }

    // 提取代码块元数据
    const langMatch = match[1].match(/language-(\w+)/);
    const codeMatch = match[1].match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
    const code = codeMatch ? decodeHtmlEntities(codeMatch[1]) : '';

    // 发出增强代码块标记
    parts.push({
      type: 'code',
      language: langMatch ? langMatch[1] : 'text',
      code,
      originalHtml: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // 剩余 HTML
  if (lastIndex < html.length) {
    parts.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'html', content: html }];
}

function decodeHtmlEntities(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
