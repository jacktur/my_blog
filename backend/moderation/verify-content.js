const fs = require('node:fs');
const path = require('node:path');
const { analyzeArticle } = require('./engine');

const cases = [
  ['普通技术文', '今天介绍 Docker 容器和数据库备份的方法。', false],
  ['普通联系方式', '欢迎联系微信 coder456 讨论 React 开发。', false],
  ['反诈引用', '骗子常说稳赚不赔，请大家不要相信，更不要转账。', false],
  ['新推广表达', '稳赚不赔，立即加入，微信 earn456。', true],
  ['同段加警示伪装', '谨防诈骗。稳赚不赔，立即加入，微信 earn456。', true],
  ['分段推广', '稳赚不赔。\n\n立即加入。\n\n微信 earn456。', true],
  ['全角变体', '稳赚不赔，立即加入，微信 ｅａｒｎ４５６。', true],
  ['谐音变体', '稳賺不赔，立刻进来，薇信 earn456。', true],
  ['含义相近推广', '每天轻松拿到高额回报，无需承担损失，马上找我报名。', true],
  ['辱骂', '你这个垃圾废物，去死吧。', true],
  ['新闻报道', '报道记录有人辱骂他人：你这个垃圾废物，去死吧。我们反对人身攻击。', false],
  ['代码测试', '代码测试样例：const text = "稳赚不赔，立即加入，微信 earn456"; 仅测试文本审核。', false],
];

function verify() {
  const results = cases.map(([name, content, requiresReview]) => {
    const analysis = analyzeArticle({ title: '内容测试', content });
    return { name, content, expected: requiresReview ? 'review' : 'published', actual: analysis.decision,
      score: analysis.score, passed: (analysis.decision !== 'published') === requiresReview };
  });
  return { at: new Date().toISOString(), modelVersion: require('./model.json').version,
    note: 'New hand-written diagnostic samples; not a representative accuracy estimate. No training or threshold tuning performed.',
    total: results.length, passed: results.filter((result) => result.passed).length, results };
}

if (require.main === module) {
  const report = verify();
  if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.passed !== report.total) process.exitCode = 1;
}
module.exports = { verify, cases };
