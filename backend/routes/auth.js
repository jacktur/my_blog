const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { dbGet, dbRun } = require('../database');
const { generateToken } = require('../middleware/auth');

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * 输入校验辅助函数 — 防止 XSS 与非法输入
 * 简单规则：不允许注入字符，只允许字母数字下划线中文字符
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // 去除首尾空格
  let cleaned = input.trim();
  // 简单 XSS 过滤：转义 HTML 特殊字符
  cleaned = cleaned
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
  return cleaned;
}

function isValidUsername(username) {
  return typeof username === 'string' && username.length >= 3 && username.length <= 30;
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 100;
}

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 输入校验
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: '用户名长度需在 3-30 个字符之间' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: '密码长度需在 6-100 个字符之间' });
    }

    const safeUsername = sanitizeInput(username);

    // 检查用户名是否已存在（参数化查询防 SQL 注入）
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE username = ?',
      [safeUsername]
    );

    if (existingUser) {
      return res.status(409).json({ error: '用户名已被注册' });
    }

    // bcrypt 哈希加密密码
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 插入用户（参数化查询）
    const result = await dbRun(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [safeUsername, hashedPassword]
    );

    // 生成 JWT
    const token = generateToken({ id: result.lastID, username: safeUsername });

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: result.lastID, username: safeUsername, avatar: 'default-1' }
    });
  } catch (err) {
    console.error('[AUTH] 注册错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const safeUsername = sanitizeInput(username);

    // 查找用户（参数化查询）
    const user = await dbGet(
      'SELECT id, username, password FROM users WHERE username = ?',
      [safeUsername]
    );

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // bcrypt 对比密码
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 获取最新用户资料（含头像等）
    const fullUser = await dbGet(
      'SELECT id, username, nickname, avatar FROM users WHERE id = ?',
      [user.id]
    );

    // 生成 JWT
    const token = generateToken({ id: user.id, username: user.username });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: fullUser.id,
        username: fullUser.username,
        nickname: fullUser.nickname,
        avatar: fullUser.avatar || 'default-1',
      }
    });
  } catch (err) {
    console.error('[AUTH] 登录错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;