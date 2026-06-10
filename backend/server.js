const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');
const { dbGet } = require('./database');
const { addClient } = require('./realtime');
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');
const tagRoutes = require('./routes/tags');
const userRoutes = require('./routes/users');
const followRoutes = require('./routes/follows');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const bookmarkRoutes = require('./routes/bookmarks');
const progressRoutes = require('./routes/progress');
const gamificationRoutes = require('./routes/gamification');
const draftRoutes = require('./routes/drafts');
const seriesRoutes = require('./routes/series');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const { suggestTags, extractSummary } = require('./utils/tagSuggester');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const server = http.createServer(app);

if (isProduction) {
  app.set('trust proxy', 1);
}

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS 配置：生产环境限制来源，开发环境允许所有
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin.split(','), credentials: true }));
} else if (!isProduction) {
  app.use(cors());
} else {
  console.log('[SERVER] 生产模式: 未配置 CORS_ORIGIN，仅允许同源浏览器访问');
}

// API 全局限流。私信页有正常轮询，阈值不能低于长时间在线的基础请求量。
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api', globalLimiter);

// 登录/注册接口更严格的限流（20 次/15分钟）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
  message: { error: '登录尝试过于频繁，请稍后再试' },
});
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '1mb' })); // 限制请求体大小
app.use(express.urlencoded({ extended: false }));

// 静态文件服务（头像等上传资源）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/articles/:id', commentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', userRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api', progressRoutes);  // /api/articles/:id/progress
app.use('/api/gamification', gamificationRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// 确保封面图上传目录存在
const coversDir = path.join(__dirname, 'uploads', 'covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

// 标签建议
app.post("/api/tags/suggest", async (req, res) => {
  try {
    const { title, content } = req.body;
    const { dbAll } = require("./database");
    const tags = await dbAll("SELECT DISTINCT t.name, (SELECT COUNT(*) FROM article_tags WHERE tag_id = t.id) as article_count FROM tags t ORDER BY article_count DESC");
    const suggestions = suggestTags(title || "", content || "", tags);
    res.json({ suggestions });
  } catch (err) {
    console.error("[TAGS] 建议错误:", err.message);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// 文章摘要
app.post("/api/articles/summarize", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "需要提供文章内容" });
    const summary = extractSummary(content);
    res.json({ summary });
  } catch (err) {
    console.error("[SUMMARIZE] 摘要错误:", err.message);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生产环境：托管前端构建产物，支持 SPA 路由
if (isProduction) {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  const frontendIndex = fs.readFileSync(path.join(frontendDist, 'index.html'), 'utf8');
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/uploads') ||
      req.path === '/ws'
    ) {
      return next();
    }
    res.type('html').send(frontendIndex);
  });
  console.log(`[SERVER] 生产模式: 前端静态文件来自 ${frontendDist}`);
}

// 初始化数据库并启动服务
initDatabase();

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', async (ws, req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) return ws.close();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await dbGet(
      'SELECT id, status, COALESCE(token_version, 0) as token_version FROM users WHERE id = ?',
      [payload.id]
    );
    if (!user || user.status === 'banned' || (payload.tokenVersion || 0) !== (user.token_version || 0)) {
      return ws.close();
    }
    if (payload.sessionId) {
      const session = await dbGet(
        `SELECT id FROM auth_sessions
         WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND token_version = ?`,
        [payload.sessionId, user.id, user.token_version || 0]
      );
      if (!session) return ws.close();
    }
    addClient(user.id, ws);
    ws.send(JSON.stringify({ type: 'connected' }));
  } catch {
    ws.close();
  }
});

server.listen(PORT, () => {
  console.log(`[SERVER] 极客博客后端已启动: http://localhost:${PORT}`);
  console.log(`[SERVER] 按 Ctrl+C 停止服务`);
});
