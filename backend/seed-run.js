const bcrypt = require('bcryptjs');
const { dbGet, dbRun, dbAll } = require('./database');
const { seedDevelopmentData } = require('./seeds/developmentSeed');

async function main() {
  console.log('=== 阶段1: 灌入 4.0 官方演示数据 ===');
  process.env.NODE_ENV = 'development';
  await seedDevelopmentData({ dbGet, dbRun });

  console.log('=== 阶段2: 恢复 admin 密码并设为站长 ===');
  const hash = await bcrypt.hash('123456', 10);
  await dbRun(
    "UPDATE users SET password = ?, role = 'admin', status = 'active', nickname = '站长' WHERE username = 'admin'",
    [hash]
  );

  console.log('=== 阶段3: 核对结果 ===');
  const admin = await dbGet("SELECT id, username, nickname, role, status FROM users WHERE username = 'admin'");
  console.log('admin:', JSON.stringify(admin));

  const counts = await dbGet(
    "SELECT (SELECT COUNT(*) FROM users) u, (SELECT COUNT(*) FROM articles) a, (SELECT COUNT(*) FROM likes) l, (SELECT COUNT(*) FROM achievements) ac"
  );
  console.log('统计:', JSON.stringify(counts));

  const arts = await dbAll(
    `SELECT a.id, a.title, u.username, (SELECT COUNT(*) FROM likes l WHERE l.article_id = a.id) AS likes
     FROM articles a JOIN users u ON u.id = a.user_id ORDER BY a.id`
  );
  for (const a of arts) console.log(`  [${a.id}] ${a.title} | 作者:${a.username} | ${a.likes}赞`);

  console.log('SEED_AND_ADMIN_DONE');
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });