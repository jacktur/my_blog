const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { dbRun } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 头像上传目录
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars', 'custom');
const COVERS_DIR = path.join(__dirname, '..', 'uploads', 'covers');

// 确保目录存在
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `user_${req.user.id}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB 限制
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('不支持的文件格式，请上传 JPG/PNG/GIF/WebP'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/upload/avatar
 * 上传自定义头像（需登录）
 */
router.post('/avatar', authenticateToken, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件大小不能超过 2MB' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    try {
      const avatarPath = `custom/${req.file.filename}`;

      // 更新用户头像记录
      await dbRun(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatarPath, req.user.id]
      );

      res.json({
        message: '头像上传成功',
        avatar: avatarPath,
        url: `/uploads/avatars/custom/${req.file.filename}`
      });
    } catch (dbErr) {
      console.error('[UPLOAD] 更新头像记录错误:', dbErr.message);
      res.status(500).json({ error: '服务器内部错误' });
    }
  });
});

// 封面图 multer 配置
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COVERS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `cover_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('不支持的文件格式'));
    cb(null, true);
  }
});

/**
 * POST /api/upload/cover
 * 上传文章封面图（需登录）
 */
router.post('/cover', authenticateToken, (req, res) => {
  uploadCover.single('cover')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? '文件大小不能超过 5MB' : err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: '请选择要上传的图片' });

    res.json({
      message: '封面上传成功',
      url: `/uploads/covers/${req.file.filename}`
    });
  });
});

module.exports = router;
