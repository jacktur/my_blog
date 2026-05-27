const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

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

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }
    // 将解码后的用户信息挂载到 req 上供后续路由使用
    req.user = user;
    next();
  });
}

/**
 * 生成 JWT Token
 * @param {object} user - { id, username }
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticateToken, generateToken };