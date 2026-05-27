const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件存放在 backend 目录下
const dbPath = path.join(__dirname, 'blog.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[DB] 连接失败:', err.message);
  } else {
    console.log('[DB] SQLite 已连接:', dbPath);
  }
});

// 启用 WAL 模式提升并发性能
db.run('PRAGMA journal_mode=WAL;');
// 启用外键约束
db.run('PRAGMA foreign_keys=ON;');

// 用户表迁移：添加个人资料字段
function migrateUsersTable() {
  const migrations = [
    "ALTER TABLE users ADD COLUMN nickname TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN email TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN birthday TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT 'default-1'",
  ];
  for (const sql of migrations) {
    db.run(sql, (err) => {
      // 忽略 "duplicate column" 错误（列已存在说明已迁移过）
      if (err && !err.message.includes('duplicate column')) {
        console.error('[DB] 迁移错误:', err.message);
      }
    });
  }
  console.log('[DB] users 表迁移检查完成');
}

// 文章表迁移：新增列
function migrateArticlesTable() {
  const migrations = [
    "ALTER TABLE articles ADD COLUMN cover_image TEXT DEFAULT NULL",
    "ALTER TABLE articles ADD COLUMN read_time INTEGER DEFAULT 0",
    "ALTER TABLE articles ADD COLUMN view_count INTEGER DEFAULT 0",
  ];
  for (const sql of migrations) {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('[DB] articles 迁移错误:', err.message);
      }
    });
  }
  console.log('[DB] articles 表迁移检查完成');
}

// 用户表迁移：添加游戏化字段
function migrateUsersGamification() {
  const migrations = [
    "ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1",
    "ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN max_streak INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN last_active_date TEXT DEFAULT NULL",
  ];
  for (const sql of migrations) {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('[DB] users 游戏化迁移错误:', err.message);
      }
    });
  }
  console.log('[DB] users 游戏化字段迁移检查完成');
}

// 初始化表结构（使用参数化 SQL，防止 SQL 注入）
function initDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createArticlesTable = `
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const createCommentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );
  `;

  const createLikesTable = `
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(user_id, article_id, created_at)
    );
  `;

  const createTagsTable = `
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createArticleTagsTable = `
    CREATE TABLE IF NOT EXISTS article_tags (
      article_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (article_id, tag_id),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `;

  const createFollowsTable = `
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(follower_id, following_id)
    );
  `;

  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('like','comment','system')),
      message TEXT NOT NULL,
      related_user_id INTEGER,
      article_id INTEGER,
      comment_preview TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    );
  `;

  db.serialize(() => {
    db.run(createUsersTable, (err) => {
      if (err) {
        console.error('[DB] 创建 users 表失败:', err.message);
      } else {
        console.log('[DB] users 表已就绪');
        // 表创建成功后再运行迁移（兼容已有数据库）
        migrateUsersTable();
        migrateUsersGamification();
      }
    });

    db.run(createArticlesTable, (err) => {
      if (err) {
        console.error('[DB] 创建 articles 表失败:', err.message);
      } else {
        console.log('[DB] articles 表已就绪');
        migrateArticlesTable();
      }
    });

    db.run(createCommentsTable, (err) => {
      if (err) {
        console.error('[DB] 创建 comments 表失败:', err.message);
      } else {
        console.log('[DB] comments 表已就绪');
      }
    });

    db.run(createLikesTable, (err) => {
      if (err) {
        console.error('[DB] 创建 likes 表失败:', err.message);
      } else {
        console.log('[DB] likes 表已就绪');
      }
    });

    db.run(createTagsTable, (err) => {
      if (err) {
        console.error('[DB] 创建 tags 表失败:', err.message);
      } else {
        console.log('[DB] tags 表已就绪');
      }
    });

    db.run(createArticleTagsTable, (err) => {
      if (err) {
        console.error('[DB] 创建 article_tags 表失败:', err.message);
      } else {
        console.log('[DB] article_tags 表已就绪');
      }
    });

    db.run(createFollowsTable, (err) => {
      if (err) {
        console.error('[DB] 创建 follows 表失败:', err.message);
      } else {
        console.log('[DB] follows 表已就绪');
      }
    });

    db.run(createNotificationsTable, (err) => {
      if (err) {
        console.error('[DB] 创建 notifications 表失败:', err.message);
      } else {
        console.log('[DB] notifications 表已就绪');
      }
    });

    // ===== Phase 1: 新表 =====
    db.run(createReadingProgressTable, (err) => {
      if (err) console.error('[DB] 创建 reading_progress 表失败:', err.message);
      else console.log('[DB] reading_progress 表已就绪');
    });

    db.run(createBookmarksTable, (err) => {
      if (err) console.error('[DB] 创建 bookmarks 表失败:', err.message);
      else console.log('[DB] bookmarks 表已就绪');
    });

    db.run(createArticleViewsTable, (err) => {
      if (err) console.error('[DB] 创建 article_views 表失败:', err.message);
      else console.log('[DB] article_views 表已就绪');
    });

    // ===== Phase 2: 游戏化表 =====
    db.run(createXpTransactionsTable, (err) => {
      if (err) console.error('[DB] 创建 xp_transactions 表失败:', err.message);
      else console.log('[DB] xp_transactions 表已就绪');
    });

    db.run(createAchievementsTable, (err) => {
      if (err) console.error('[DB] 创建 achievements 表失败:', err.message);
      else console.log('[DB] achievements 表已就绪');
    });

    db.run(createUserAchievementsTable, (err) => {
      if (err) console.error('[DB] 创建 user_achievements 表失败:', err.message);
      else {
        console.log('[DB] user_achievements 表已就绪');
        seedAchievements();
      }
    });

    db.run(createActivityFeedTable, (err) => {
      if (err) console.error('[DB] 创建 activity_feed 表失败:', err.message);
      else console.log('[DB] activity_feed 表已就绪');
    });

    // ===== Phase 3: 草稿 & 系列 =====
    db.run(createDraftsTable, (err) => {
      if (err) console.error('[DB] 创建 drafts 表失败:', err.message);
      else console.log('[DB] drafts 表已就绪');
    });

    db.run(createSeriesTable, (err) => {
      if (err) console.error('[DB] 创建 series 表失败:', err.message);
      else console.log('[DB] series 表已就绪');
    });

    db.run(createSeriesArticlesTable, (err) => {
      if (err) console.error('[DB] 创建 series_articles 表失败:', err.message);
      else console.log('[DB] series_articles 表已就绪');
    });

    db.run(createArticleAnalyticsTable, (err) => {
      if (err) console.error('[DB] 创建 article_analytics 表失败:', err.message);
      else console.log('[DB] article_analytics 表已就绪');
    });

    // ===== Phase 4: 私信表 =====
    db.run(createConversationsTable, (err) => {
      if (err) console.error('[DB] 创建 conversations 表失败:', err.message);
      else console.log('[DB] conversations 表已就绪');
    });

    db.run(createMessagesTable, (err) => {
      if (err) console.error('[DB] 创建 messages 表失败:', err.message);
      else console.log('[DB] messages 表已就绪');
    });

    db.run(createConversationReadersTable, (err) => {
      if (err) console.error('[DB] 创建 conversation_readers 表失败:', err.message);
      else console.log('[DB] conversation_readers 表已就绪');
    });
  });
}

// 安全的参数化查询辅助函数
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * 创建通知的辅助函数
 * 自动跳过自己给自己发通知
 */
async function createNotification({ userId, type, message, relatedUserId, articleId, commentPreview }) {
  if (relatedUserId && userId === relatedUserId) return;
  return dbRun(
    `INSERT INTO notifications (user_id, type, message, related_user_id, article_id, comment_preview)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, message, relatedUserId || null, articleId || null, commentPreview || null]
  );
}

// ===== Phase 1: 阅读进度表 =====
const createReadingProgressTable = `
  CREATE TABLE IF NOT EXISTS reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    scroll_percentage REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE(user_id, article_id)
  );
`;

// ===== Phase 1: 书签表 =====
const createBookmarksTable = `
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE(user_id, article_id)
  );
`;

// ===== Phase 1: 文章阅读事件表 =====
const createArticleViewsTable = `
  CREATE TABLE IF NOT EXISTS article_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    ip TEXT NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );
`;

// ===== Phase 2: XP 相关表 =====
const createXpTransactionsTable = `
  CREATE TABLE IF NOT EXISTS xp_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

const createAchievementsTable = `
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT 'trophy',
    xp_reward INTEGER DEFAULT 0,
    trigger_event TEXT NOT NULL,
    condition_json TEXT DEFAULT '{}'
  );
`;

const createUserAchievementsTable = `
  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
  );
`;

const createActivityFeedTable = `
  CREATE TABLE IF NOT EXISTS activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

// ===== Phase 3: 草稿表 =====
const createDraftsTable = `
  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    cover_image TEXT,
    article_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
  );
`;

// ===== Phase 3: 系列表 =====
const createSeriesTable = `
  CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

const createSeriesArticlesTable = `
  CREATE TABLE IF NOT EXISTS series_articles (
    series_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (series_id, article_id),
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );
`;

// ===== 成就种子数据 =====
const SEED_ACHIEVEMENTS = [
  ['first_article', 'First Dispatch', 'Publish your first article', 'zap', 25, 'publish_article', '{"count":1,"field":"articles"}'],
  ['prolific_writer', 'Data Stream', 'Publish 10 articles', 'layers', 100, 'publish_article', '{"count":10,"field":"articles"}'],
  ['first_like_received', 'Signal Detected', 'Receive your first like', 'heart', 10, 'like_received', '{"count":1,"field":"likes"}'],
  ['popular', 'Going Viral', 'Receive 100 total likes', 'flame', 200, 'like_received', '{"count":100,"field":"likes"}'],
  ['commentator', 'Packet Sent', 'Write 25 comments', 'message-circle', 75, 'comment', '{"count":25,"field":"comments"}'],
  ['social_butterfly', 'Mesh Network', 'Get 10 followers', 'users', 50, 'follow', '{"count":10,"field":"followers"}'],
  ['night_owl', 'After Dark', 'Publish an article between 12am-5am', 'moon', 15, 'publish_article', '{"nightOwl":true}'],
  ['bookworm', 'Data Crawler', 'Read 50 articles', 'book', 100, 'read_article', '{"count":50,"field":"reads"}'],
  ['collector', 'Archive Access', 'Bookmark 20 articles', 'bookmark', 50, 'bookmark', '{"count":20,"field":"bookmarks"}'],
  ['streak_7', 'Uptime: 1 Week', 'Maintain a 7-day streak', 'zap', 50, 'streak', '{"streak":7}'],
  ['streak_30', 'Uptime: 1 Month', 'Maintain a 30-day streak', 'award', 200, 'streak', '{"streak":30}'],
  ['code_master', 'Assembly Required', 'Publish 5 articles with code blocks', 'code', 75, 'publish_article', '{"count":5,"field":"code_articles"}'],
  ['tag_master', 'Taxonomy Expert', 'Create articles with 10 different tags', 'hash', 75, 'publish_article', '{"count":10,"field":"unique_tags"}'],
];

function seedAchievements() {
  db.get('SELECT COUNT(*) as count FROM achievements', (err, row) => {
    if (err) return console.error('[DB] 检查成就数据错误:', err.message);
    if (row.count === 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO achievements (code, name, description, icon, xp_reward, trigger_event, condition_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const a of SEED_ACHIEVEMENTS) {
        stmt.run(a, (e) => { if (e) console.error('[DB] 插入成就错误:', e.message); });
      }
      stmt.finalize();
      console.log('[DB] 成就种子数据已初始化');
    }
  });
}

const createArticleAnalyticsTable = `
  CREATE TABLE IF NOT EXISTS article_analytics (
    article_id INTEGER PRIMARY KEY,
    total_reads INTEGER DEFAULT 0,
    total_read_time INTEGER DEFAULT 0,
    avg_scroll_depth REAL DEFAULT 0,
    reads_25 INTEGER DEFAULT 0,
    reads_50 INTEGER DEFAULT 0,
    reads_75 INTEGER DEFAULT 0,
    reads_100 INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );
`;

// ====== Phase 4: 私信功能表 ======
const createConversationsTable = `
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant1_id INTEGER NOT NULL,
    participant2_id INTEGER NOT NULL,
    last_message TEXT,
    last_message_at DATETIME,
    last_sender_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

const createMessagesTable = `
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

const createConversationReadersTable = `
  CREATE TABLE IF NOT EXISTS conversation_readers (
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

module.exports = { db, initDatabase, migrateUsersTable, dbGet, dbRun, dbAll, createNotification };