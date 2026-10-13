const { normalize } = require('./features');

const INSULT = /垃圾|废物|蠢货|白痴|傻逼|傻比|贱人|畜生/u;
const TARGETED_INSULT = /(?:你|您|他|她|这个人|那个人)(?:们)?(?:就是|真是|是|这个|那个|个|一群|一个|这|那|的|真|个大|大|死|小|臭|太|很|简直是|就是个|是个|就是一个|真是个|就是一群|是一个){0,4}(?:垃圾(?!文件|分类|回收|处理|桶)|废物(?!回收|利用)|蠢货|白痴|傻逼|傻比|贱人|畜生)/u;
const HOSTILITY = /去死|该死|死吧|不得好死/u;
const REPORT = /(?:报道|记录|引用|示例|样例|辱骂|骂道|说过|原话)/u;

function detectAttack(raw) {
  let text = normalize(raw).replace(/(?<=[\u4e00-\u9fff])[ .·_*\-]{1,2}(?=[\u4e00-\u9fff])/g, '');
  // Exclude only explicitly introduced quoted spans, not subsequent direct speech.
  text = text.replace(/[“「『"]([^”」』"\n]*)[”」』"]/gu, (span, quoted, offset) =>
    REPORT.test(text.slice(Math.max(0, offset - 40), offset)) ? '。' : span);
  let direct = false;
  let contextual = false;
  for (const clause of text.split(/[。！？!?\n；;]/u)) {
    if (!INSULT.test(clause) && !HOSTILITY.test(clause)) continue;
    const isContext = /(?:不要|不能|不应该|禁止|反对|避免|请勿).{0,12}(?:说|骂|辱骂|攻击|叫|用)/u.test(clause)
      || /(?:报道|记录|引用|示例|样例).{0,20}(?:辱骂|攻击|说|原话|代码)/u.test(clause);
    if (isContext) { contextual = true; continue; }
    if (TARGETED_INSULT.test(clause) || HOSTILITY.test(clause)) direct = true;
  }
  return { direct, contextual };
}

module.exports = { detectAttack };
