const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();
const { dbGet, dbRun } = require('../database');
const { generateToken } = require('../middleware/auth');

const SALT_ROUNDS = 10;
const CODE_TTL_MINUTES = 10;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback';

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim();
}

function isValidUsername(username) {
  return typeof username === 'string' && username.length >= 3 && username.length <= 30;
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 100;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    avatar: user.avatar || 'default-1',
    role: user.role || 'user',
    status: user.status || 'active',
  };
}

function issueAuthResponse(res, user, message = '登录成功') {
  const token = generateToken({ id: user.id, username: user.username });
  return res.json({ message, token, user: publicUser(user) });
}

function ensureSmtpConfigured() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }
}

function getTransporter() {
  ensureSmtpConfigured();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_NOT_CONFIGURED');
  }
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL
  );
}

function redirectWithAuth(res, user) {
  const token = generateToken({ id: user.id, username: user.username });
  const params = new URLSearchParams({
    token,
    user: JSON.stringify(publicUser(user)),
  });
  res.redirect(`${FRONTEND_URL}/auth/google/success?${params.toString()}`);
}

function redirectWithGoogleError(res, reason) {
  const params = new URLSearchParams({ error: reason });
  res.redirect(`${FRONTEND_URL}/login?${params.toString()}`);
}

async function findUserByIdentifier(identifier) {
  return dbGet(
    `SELECT id, username, password, nickname, email, avatar
            , role, status
     FROM users
     WHERE username = ? OR lower(email) = lower(?)`,
    [identifier, identifier]
  );
}

async function verifyEmailCode(email, code) {
  const record = await dbGet(
    `SELECT id, code_hash
     FROM email_verification_codes
     WHERE lower(email) = lower(?)
       AND used_at IS NULL
       AND datetime(expires_at) > datetime('now')
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  );

  if (!record) return false;
  const ok = await bcrypt.compare(code, record.code_hash);
  if (!ok) return false;

  await dbRun(
    "UPDATE email_verification_codes SET used_at = datetime('now') WHERE id = ?",
    [record.id]
  );
  return true;
}

router.post('/send-code', async (req, res) => {
  try {
    const email = sanitizeInput(req.body.email).toLowerCase();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: '请输入有效邮箱' });
    }

    const existingUser = await dbGet('SELECT id FROM users WHERE lower(email) = lower(?)', [email]);
    if (existingUser) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    const recentCode = await dbGet(
      `SELECT id
       FROM email_verification_codes
       WHERE lower(email) = lower(?)
         AND datetime(created_at) > datetime('now', '-60 seconds')
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );
    if (recentCode) {
      return res.status(429).json({ error: '验证码发送太频繁，请稍后再试' });
    }

    const transporter = getTransporter();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    await dbRun(
      'INSERT INTO email_verification_codes (email, code_hash, expires_at) VALUES (?, ?, ?)',
      [email, codeHash, expiresAt]
    );

    await transporter.sendMail({
      from: `"极客博客" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '极客博客注册验证码',
      text: `你的注册验证码是 ${code}，${CODE_TTL_MINUTES} 分钟内有效。`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#1d1d1f">
          <h2>极客博客注册验证码</h2>
          <p>你的验证码是：</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
          <p>验证码 ${CODE_TTL_MINUTES} 分钟内有效。如果不是你本人操作，请忽略这封邮件。</p>
        </div>
      `,
    });

    res.json({ message: '验证码已发送' });
  } catch (err) {
    if (err.message === 'SMTP_NOT_CONFIGURED') {
      return res.status(500).json({ error: 'SMTP 邮箱配置缺失，请检查后端 .env' });
    }
    console.error('[AUTH] 验证码发送错误:', err.message);
    res.status(500).json({ error: '验证码发送失败' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const email = sanitizeInput(req.body.email).toLowerCase();
    const username = sanitizeInput(req.body.username);
    const { password, code } = req.body;

    if (!email || !username || !password || !code) {
      return res.status(400).json({ error: '请填写邮箱、用户名、密码和验证码' });
    }
    if (!isValidEmail(email)) return res.status(400).json({ error: '请输入有效邮箱' });
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: '用户名长度需在 3-30 个字符之间' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: '密码长度需在 6-100 个字符之间' });
    }

    const existingUser = await dbGet(
      'SELECT id FROM users WHERE username = ? OR lower(email) = lower(?)',
      [username, email]
    );
    if (existingUser) {
      return res.status(409).json({ error: '用户名或邮箱已被注册' });
    }

    const codeOk = await verifyEmailCode(email, String(code).trim());
    if (!codeOk) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await dbRun(
      'INSERT INTO users (username, password, email, email_verified) VALUES (?, ?, ?, 1)',
      [username, hashedPassword, email]
    );
    const user = await dbGet(
      'SELECT id, username, nickname, email, avatar, role, status FROM users WHERE id = ?',
      [result.lastID]
    );

    issueAuthResponse(res.status(201), user, '注册成功');
  } catch (err) {
    console.error('[AUTH] 注册错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const identifier = sanitizeInput(req.body.identifier || req.body.username);
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: '用户名/邮箱和密码不能为空' });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user || !user.password) {
      return res.status(401).json({ error: '用户名/邮箱或密码错误' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名/邮箱或密码错误' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ error: '账号已被封禁，请联系站长' });
    }

    issueAuthResponse(res, user);
  } catch (err) {
    console.error('[AUTH] 登录错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/google', (req, res) => {
  try {
    const client = getGoogleClient();
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
    });
    res.redirect(authUrl);
  } catch (err) {
    if (err.message === 'GOOGLE_NOT_CONFIGURED') {
      return res.status(500).json({ error: 'Google OAuth 配置缺失，请检查后端 .env' });
    }
    console.error('[AUTH] Google 授权地址生成错误:', err.message);
    res.status(500).json({ error: 'Google 登录暂不可用' });
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return redirectWithGoogleError(res, '缺少 Google 授权码');

    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = (payload.email || '').toLowerCase();

    if (!googleId || !email) {
      return redirectWithGoogleError(res, 'Google 账号缺少邮箱信息');
    }

    let user = await dbGet(
      `SELECT id, username, nickname, email, avatar
              , role, status
       FROM users
       WHERE google_id = ? OR lower(email) = lower(?)`,
      [googleId, email]
    );

    if (user) {
      if (user.status === 'banned') {
        return redirectWithGoogleError(res, '账号已被封禁，请联系站长');
      }
      await dbRun(
        'UPDATE users SET google_id = ?, email = COALESCE(email, ?), email_verified = 1 WHERE id = ?',
        [googleId, email, user.id]
      );
    } else {
      const emailName = email.split('@')[0].replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 20) || 'google';
      let baseUsername = emailName.length >= 3 ? emailName : `user${emailName}`;
      let username = baseUsername;
      let suffix = 1;

      while (await dbGet('SELECT id FROM users WHERE username = ?', [username])) {
        username = `${baseUsername}${suffix}`;
        suffix += 1;
      }

      const randomPassword = await bcrypt.hash(`${googleId}:${Date.now()}`, SALT_ROUNDS);
      const result = await dbRun(
        `INSERT INTO users (username, password, email, email_verified, google_id, nickname)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [username, randomPassword, email, googleId, payload.name || null]
      );
      user = await dbGet(
        'SELECT id, username, nickname, email, avatar, role, status FROM users WHERE id = ?',
        [result.lastID]
      );
    }

    const refreshedUser = await dbGet(
      'SELECT id, username, nickname, email, avatar, role, status FROM users WHERE id = ?',
      [user.id]
    );
    redirectWithAuth(res, refreshedUser);
  } catch (err) {
    console.error('[AUTH] Google 回调错误:', err.message);
    redirectWithGoogleError(res, 'Google 登录失败');
  }
});

module.exports = router;
