const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { checkAchievements, addActivity } = require('./gamification');

/**
 * POST /api/follows/:id
 * 关注指定用户
 */
router.post('/:id', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.id, 10);

    if (followerId === followingId) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    const targetUser = await dbGet('SELECT id FROM users WHERE id = ?', [followingId]);
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const existing = await dbGet(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );
    if (existing) {
      return res.status(409).json({ error: '已关注该用户' });
    }

    await dbRun(
      'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
      [followerId, followingId]
    );

    await addActivity(followerId, 'follow', '关注了用户 #' + followingId, 'user', followingId);
    const achievements = await checkAchievements(followingId, 'follow');

    res.status(201).json({ message: '关注成功', gamification: { followedUserAchievements: achievements } });
  } catch (err) {
    console.error('[FOLLOWS] 关注错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * DELETE /api/follows/:id
 * 取消关注指定用户
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.id, 10);

    const result = await dbRun(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '未关注该用户' });
    }

    res.json({ message: '已取消关注' });
  } catch (err) {
    console.error('[FOLLOWS] 取消关注错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/follows/:id/check
 * 检查当前登录用户是否关注了指定用户
 */
router.get('/:id/check', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.id, 10);

    const follow = await dbGet(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({ isFollowing: !!follow });
  } catch (err) {
    console.error('[FOLLOWS] 检查关注状态错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/follows/:id/count
 * 获取指定用户的关注/粉丝数量
 */
router.get('/:id/count', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const followingCount = await dbGet(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      [userId]
    );

    const followerCount = await dbGet(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [userId]
    );

    res.json({
      counts: {
        following: followingCount.count,
        followers: followerCount.count,
      }
    });
  } catch (err) {
    console.error('[FOLLOWS] 获取关注数量错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
