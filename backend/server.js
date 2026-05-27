const express = require('express');
const cors = require('cors');
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');
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
const { suggestTags, extractSummary } = require('./utils/tagSuggester');

const app = express();
const PORT = process.env.PORT || 3001;

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '1mb' })); // 限制请求体大小
app.use(express.urlencoded({ extended: false }));

// 静态文件服务（头像等上传资源）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/auth', authRoutes);
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

// 初始化数据库并启动服务
initDatabase();

app.listen(PORT, () => {
  console.log(`[SERVER] 极客博客后端已启动: http://localhost:${PORT}`);
  console.log(`[SERVER] 按 Ctrl+C 停止服务`);
});