const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('../database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured. Copy backend/.env.example to backend/.env and set JWT_SECRET.');
}
if (isProduction && JWT_SECRET === 'dev_jwt_secret') {
  throw new Error('JWT_SECRET must be changed before running in production.');
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(401).json({ error: '令牌无效或已过期' });
    }

    try {
      const currentUser = await dbGet(
        "SELECT id, username, role, status, COALESCE(token_version, 0) as token_version FROM users WHERE id = ?",
        [user.id]
      );
      if (!currentUser) {
        return res.status(401).json({ error: '用户不存在' });
      }
      if (currentUser.status === 'banned') {
        return res.status(403).json({ error: '账号已被封禁' });
      }
      if ((user.tokenVersion || 0) !== (currentUser.token_version || 0)) {
        return res.status(401).json({ error: '令牌已失效，请重新登录' });
      }
      if (user.sessionId) {
        const session = await dbGet(
          `SELECT id FROM auth_sessions
           WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND token_version = ?`,
          [user.sessionId, currentUser.id, currentUser.token_version || 0]
        );
        if (!session) {
          return res.status(401).json({ error: '会话已失效，请重新登录' });
        }
        await dbRun(
          "UPDATE auth_sessions SET last_seen_at = datetime('now') WHERE id = ?",
          [user.sessionId]
        );
      }
      req.user = currentUser;
      next();
    } catch (dbErr) {
      console.error('[AUTH] 认证用户状态检查失败:', dbErr.message);
      res.status(500).json({ error: '服务器内部错误' });
    }
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '需要站长权限' });
  }
  next();
}

/**
 * 生成 JWT Token
 * @param {object} user - { id, username }
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role || 'user',
      tokenVersion: user.token_version || 0,
      sessionId: user.session_id || user.sessionId || null,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticateToken, requireAdmin, generateToken };
