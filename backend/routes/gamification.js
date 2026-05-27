const express = require('express');
const router = express.Router();
const { db, dbGet, dbRun, dbAll, createNotification } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// ====== Level Definitions ======
const LEVELS = [
  { level: 1, xp: 0, title: 'Terminal Newbie' },
  { level: 2, xp: 100, title: 'Script Kiddie' },
  { level: 3, xp: 250, title: 'Packet Sniffer' },
  { level: 4, xp: 500, title: 'Stack Overflow' },
  { level: 5, xp: 850, title: 'Bug Hunter' },
  { level: 6, xp: 1300, title: 'Net Runner' },
  { level: 7, xp: 1850, title: 'Kernel Hacker' },
  { level: 8, xp: 2500, title: 'Data Miner' },
  { level: 9, xp: 3300, title: 'Cryptographer' },
  { level: 10, xp: 4300, title: 'Code Artisan' },
  { level: 11, xp: 5500, title: 'System Architect' },
  { level: 12, xp: 7000, title: 'Protocol Master' },
  { level: 13, xp: 8800, title: 'Neural Programmer' },
  { level: 14, xp: 11000, title: 'Quantum Coder' },
  { level: 15, xp: 14000, title: 'Cyber Jacker' },
  { level: 16, xp: 18000, title: 'AI Whisperer' },
  { level: 17, xp: 23000, title: 'Digital Alchemist' },
  { level: 18, xp: 30000, title: 'Mainframe Overlord' },
  { level: 19, xp: 40000, title: 'Source of All Truth' },
  { level: 20, xp: 55000, title: 'The Ghost in the Shell' },
];

function getLevel(xp) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) lvl = l;
    else break;
  }
  return lvl;
}

function getNextLevelXp(currentLevel) {
  const next = LEVELS.find(l => l.level === currentLevel + 1);
  return next ? next.xp : null;
}

// ====== Internal: Grant XP ======
async function grantXP(userId, amount, reason, referenceType = null, referenceId = null) {
  if (amount <= 0) return null;
  try {
    const user = await dbGet('SELECT xp, level FROM users WHERE id = ?', [userId]);
    if (!user) return null;

    const oldLevel = user.level || 1;
    const oldXp = user.xp || 0;
    const newXp = oldXp + amount;
    const newLevel = getLevel(newXp);
    const leveledUp = newLevel.level > oldLevel;

    // Record the XP transaction
    await dbRun(
      `INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, amount, reason, referenceType, referenceId]
    );

    // Update user XP and level
    await dbRun(
      'UPDATE users SET xp = ?, level = ? WHERE id = ?',
      [newXp, newLevel.level, userId]
    );

    // Notification on level up
    if (leveledUp) {
      const oldTitle = LEVELS.find(l => l.level === oldLevel)?.title || 'Unknown';
      const newTitle = newLevel.title;
      await createNotification({
        userId,
        type: 'system',
        message: `LEVEL UP: ${oldTitle} → ${newTitle}`,
      });
    }

    return { xp: newXp, level: newLevel.level, title: newLevel.title, leveledUp, amount };
  } catch (err) {
    console.error('[GAMIFICATION] grantXP error:', err.message);
    return null;
  }
}

// ====== Internal: Check & Update Streak ======
async function checkStreak(userId) {
  try {
    const user = await dbGet(
      'SELECT current_streak, max_streak, last_active_date FROM users WHERE id = ?',
      [userId]
    );
    if (!user) return { streak: 0, bonus: 0 };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let streak = user.current_streak || 0;
    let bonusXp = 0;

    if (user.last_active_date === today) {
      // Already checked in today
      return { streak, bonus: 0, alreadyCheckedIn: true };
    }

    if (user.last_active_date === yesterday) {
      // Consecutive day
      streak += 1;
    } else {
      // Streak broken or first time
      streak = 1;
    }

    // Check streak milestones
    if ([3, 7, 14, 30].includes(streak)) {
      const bonuses = { 3: 5, 7: 15, 14: 30, 30: 100 };
      bonusXp = bonuses[streak] || 0;
    }

    // Bonus for daily check-in
    bonusXp += streak >= 7 ? 15 : 5;

    // Update user
    const maxStreak = Math.max(user.max_streak || 0, streak);
    await dbRun(
      'UPDATE users SET current_streak = ?, max_streak = ?, last_active_date = ? WHERE id = ?',
      [streak, maxStreak, today, userId]
    );

    // Grant bonus XP
    if (bonusXp > 0) {
      await grantXP(userId, bonusXp, 'daily_streak_bonus', 'streak', streak);
    }

    return { streak, bonus: bonusXp, maxStreak };
  } catch (err) {
    console.error('[GAMIFICATION] checkStreak error:', err.message);
    return { streak: 0, bonus: 0 };
  }
}

// ====== Internal: Check Achievements ======
const ACHIEVEMENTS = [
  { code: 'first_article', name: 'First Dispatch', description: 'Publish your first article', icon: 'zap', xpReward: 25, trigger: 'publish_article', condition: { count: 1, field: 'articles' } },
  { code: 'prolific_writer', name: 'Data Stream', description: 'Publish 10 articles', icon: 'layers', xpReward: 100, trigger: 'publish_article', condition: { count: 10, field: 'articles' } },
  { code: 'first_like_received', name: 'Signal Detected', description: 'Receive your first like', icon: 'heart', xpReward: 10, trigger: 'like_received', condition: { count: 1, field: 'likes' } },
  { code: 'popular', name: 'Going Viral', description: 'Receive 100 total likes', icon: 'flame', xpReward: 200, trigger: 'like_received', condition: { count: 100, field: 'likes' } },
  { code: 'commentator', name: 'Packet Sent', description: 'Write 25 comments', icon: 'message-circle', xpReward: 75, trigger: 'comment', condition: { count: 25, field: 'comments' } },
  { code: 'social_butterfly', name: 'Mesh Network', description: 'Get 10 followers', icon: 'users', xpReward: 50, trigger: 'follow', condition: { count: 10, field: 'followers' } },
  { code: 'night_owl', name: 'After Dark', description: 'Publish an article between 12am-5am', icon: 'moon', xpReward: 15, trigger: 'publish_article', condition: { nightOwl: true } },
  { code: 'bookworm', name: 'Data Crawler', description: 'Read 50 articles', icon: 'book', xpReward: 100, trigger: 'read_article', condition: { count: 50, field: 'reads' } },
  { code: 'collector', name: 'Archive Access', description: 'Bookmark 20 articles', icon: 'bookmark', xpReward: 50, trigger: 'bookmark', condition: { count: 20, field: 'bookmarks' } },
  { code: 'streak_7', name: 'Uptime: 1 Week', description: 'Maintain a 7-day streak', icon: 'zap', xpReward: 50, trigger: 'streak', condition: { streak: 7 } },
  { code: 'streak_30', name: 'Uptime: 1 Month', description: 'Maintain a 30-day streak', icon: 'award', xpReward: 200, trigger: 'streak', condition: { streak: 30 } },
  { code: 'code_master', name: 'Assembly Required', description: 'Publish 5 articles with code blocks', icon: 'code', xpReward: 75, trigger: 'publish_article', condition: { count: 5, field: 'code_articles' } },
  { code: 'tag_master', name: 'Taxonomy Expert', description: 'Create articles with 10 different tags', icon: 'hash', xpReward: 75, trigger: 'publish_article', condition: { count: 10, field: 'unique_tags' } },
];

async function checkAchievements(userId, triggerEvent, context = {}) {
  try {
    const relevantAchievements = ACHIEVEMENTS.filter(a => a.trigger === triggerEvent);
    if (relevantAchievements.length === 0) return [];

    const unlocked = await dbAll(
      'SELECT achievement_id FROM user_achievements WHERE user_id = ?',
      [userId]
    );
    const unlockedIds = new Set(unlocked.map(u => u.achievement_id));

    const newAchievements = [];

    for (const ach of relevantAchievements) {
      const dbAch = await dbGet('SELECT id FROM achievements WHERE code = ?', [ach.code]);
      if (!dbAch) continue;
      if (unlockedIds.has(dbAch.id)) continue;

      let earned = false;

      if (ach.code === 'night_owl') {
        const hour = context.hour !== undefined ? context.hour : new Date().getHours();
        earned = hour >= 0 && hour < 5;
      } else if (ach.code.startsWith('streak_')) {
        earned = context.streak >= ach.condition.streak;
      } else if (ach.condition.field && ach.condition.count) {
        let actualCount = 0;
        switch (ach.condition.field) {
          case 'articles':
            const r1 = await dbGet('SELECT COUNT(*) as c FROM articles WHERE user_id = ?', [userId]);
            actualCount = r1.c;
            break;
          case 'likes':
            const r2 = await dbGet(
              'SELECT COUNT(*) as c FROM likes WHERE article_id IN (SELECT id FROM articles WHERE user_id = ?)',
              [userId]
            );
            actualCount = r2.c;
            break;
          case 'comments':
            const r3 = await dbGet('SELECT COUNT(*) as c FROM comments WHERE user_id = ?', [userId]);
            actualCount = r3.c;
            break;
          case 'followers':
            const r4 = await dbGet('SELECT COUNT(*) as c FROM follows WHERE following_id = ?', [userId]);
            actualCount = r4.c;
            break;
          case 'bookmarks':
            const r5 = await dbGet('SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ?', [userId]);
            actualCount = r5.c;
            break;
          case 'unique_tags':
            const r6 = await dbGet(
              `SELECT COUNT(DISTINCT t.id) as c FROM tags t
               JOIN article_tags at ON t.id = at.tag_id
               JOIN articles a ON at.article_id = a.id
               WHERE a.user_id = ?`,
              [userId]
            );
            actualCount = r6.c;
            break;
          case 'code_articles':
            const r7 = await dbGet(
              `SELECT COUNT(*) as c FROM articles
               WHERE user_id = ? AND content LIKE '%\`\`\`%'`,
              [userId]
            );
            actualCount = r7.c;
            break;
        }
        earned = actualCount >= ach.condition.count;
      }

      if (earned) {
        await dbRun(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
          [userId, dbAch.id]
        );
        if (ach.xpReward > 0) {
          await grantXP(userId, ach.xpReward, `achievement:${ach.code}`, 'achievement', dbAch.id);
        }
        await createNotification({
          userId,
          type: 'system',
          message: `ACHIEVEMENT: ${ach.name} — ${ach.description}`,
        });
        newAchievements.push({ code: ach.code, name: ach.name, xpReward: ach.xpReward });
      }
    }

    return newAchievements;
  } catch (err) {
    console.error('[GAMIFICATION] checkAchievements error:', err.message);
    return [];
  }
}

// ====== Internal: Add Activity Feed ======
async function addActivity(userId, type, description, refType = null, refId = null, meta = null) {
  try {
    await dbRun(
      `INSERT INTO activity_feed (user_id, activity_type, description, reference_type, reference_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, description, refType, refId, meta ? JSON.stringify(meta) : null]
    );
  } catch (err) {
    console.error('[GAMIFICATION] addActivity error:', err.message);
  }
}

// ====== API Routes ======

/**
 * POST /api/gamification/checkin
 * 每日签到（自动调用）
 */
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const result = await checkStreak(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('[GAMIFICATION] checkin error:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/gamification/user
 * 获取当前用户的游戏化数据
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT xp, level, current_streak, max_streak, last_active_date FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const levelInfo = getLevel(user.xp || 0);
    const nextLevelXp = getNextLevelXp(user.level || 1);
    const currentLevelXp = LEVELS.find(l => l.level === user.level)?.xp || 0;

    res.json({
      xp: user.xp || 0,
      level: user.level || 1,
      title: levelInfo.title,
      currentStreak: user.current_streak || 0,
      maxStreak: user.max_streak || 0,
      nextLevelXp,
      currentLevelXp,
      xpToNextLevel: nextLevelXp ? nextLevelXp - (user.xp || 0) : null,
      levelProgress: nextLevelXp ? ((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 100,
    });
  } catch (err) {
    console.error('[GAMIFICATION] user error:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/gamification/xp-history
 * XP 交易历史
 */
router.get('/xp-history', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 30;
    const offset = (page - 1) * limit;

    const [{ total }] = await [dbGet(
      'SELECT COUNT(*) as total FROM xp_transactions WHERE user_id = ?',
      [req.user.id]
    )];

    const history = await dbAll(
      `SELECT * FROM xp_transactions WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    res.json({ history, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[GAMIFICATION] xp-history error:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/gamification/leaderboard
 * 排行榜 Top 100
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const leaders = await dbAll(
      `SELECT id, username, xp, level, avatar, current_streak
       FROM users
       ORDER BY xp DESC, level DESC
       LIMIT 100`
    );
    res.json({ leaderboard: leaders.map((u, i) => ({ rank: i + 1, ...u })) });
  } catch (err) {
    console.error('[GAMIFICATION] leaderboard error:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/gamification/achievements
 * 获取所有成就及用户解锁状态
 */
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const allAch = await dbAll('SELECT * FROM achievements ORDER BY id');
    const userAch = await dbAll(
      `SELECT a.id, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ?`,
      [req.user.id]
    );
    const userAchSet = new Set(userAch.map(u => u.id));

    const result = allAch.map(a => ({
      ...a,
      unlocked: userAchSet.has(a.id),
      unlockedAt: userAch.find(u => u.id === a.id)?.unlocked_at || null,
    }));

    res.json({ achievements: result });
  } catch (err) {
    console.error('[GAMIFICATION] achievements error:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/gamification/dashboard
 * 用户仪表盘聚合数据
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Parallel queries for all dashboard data
    const [
      userInfo,
      articleCount, totalLikes, totalComments, totalViews,
      followerCount, followingCount,
      recentActivity, recentReads,
      gamification,
    ] = await Promise.all([
      dbGet('SELECT id, username, nickname, avatar, xp, level, current_streak, max_streak, created_at FROM users WHERE id = ?', [userId]),

      dbGet('SELECT COUNT(*) as count FROM articles WHERE user_id = ?', [userId]),
      dbGet('SELECT COUNT(*) as count FROM likes WHERE article_id IN (SELECT id FROM articles WHERE user_id = ?)', [userId]),
      dbGet('SELECT COUNT(*) as count FROM comments WHERE article_id IN (SELECT id FROM articles WHERE user_id = ?)', [userId]),
      dbAll(
        `SELECT COALESCE(SUM(article_views), 0) as count FROM
         (SELECT COUNT(*) as article_views FROM article_views WHERE article_id IN (SELECT id FROM articles WHERE user_id = ?) GROUP BY article_id)`,
        [userId]
      ).then(r => ({ count: r[0]?.count || 0 })),

      dbGet('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [userId]),
      dbGet('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [userId]),

      dbAll(
        `SELECT * FROM activity_feed WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
        [userId]
      ),
      dbAll(
        `SELECT rp.article_id, a.title, rp.scroll_percentage, rp.updated_at
         FROM reading_progress rp
         JOIN articles a ON rp.article_id = a.id
         WHERE rp.user_id = ? ORDER BY rp.updated_at DESC LIMIT 10`,
        [userId]
      ),
      dbGet('SELECT xp, level, current_streak, max_streak FROM users WHERE id = ?', [userId]),
    ]);

    const levelInfo = getLevel(gamification?.xp || 0);
    const nextLevelXp = getNextLevelXp(gamification?.level || 1);
    const currentLevelXp = LEVELS.find(l => l.level === gamification?.level)?.xp || 0;

    res.json({
      user: {
        id: userInfo.id,
        username: userInfo.username,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar,
        createdAt: userInfo.created_at,
        xp: gamification?.xp || 0,
        level: gamification?.level || 1,
        title: levelInfo.title,
        currentStreak: gamification?.current_streak || 0,
        maxStreak: gamification?.max_streak || 0,
        nextLevelXp,
        currentLevelXp,
        levelProgress: nextLevelXp ? ((gamification?.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 100,
      },
      stats: {
        articles: articleCount.count,
        likesReceived: totalLikes.count,
        comments: totalComments.count,
        views: totalViews.count,
        followers: followerCount.count,
        following: followingCount.count,
      },
      recentActivity,
      readingHistory: recentReads,
    });
  } catch (err) {
    console.error('[GAMIFICATION] dashboard error:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
module.exports.grantXP = grantXP;
module.exports.checkStreak = checkStreak;
module.exports.checkAchievements = checkAchievements;
module.exports.addActivity = addActivity;
module.exports.ACHIEVEMENTS = ACHIEVEMENTS;
