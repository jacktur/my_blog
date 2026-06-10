const express = require('express');
const router = express.Router();
const { dbGet, dbRun } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const TARGETS = new Set(['article', 'comment', 'user', 'message']);
const REPORT_REASONS = new Set([
  '色情低俗',
  '违法违规',
  '政治敏感',
  '不实信息',
  '违规营销',
  '危害人身安全',
  '未成年相关',
  '侵犯权益',
  '其他',
]);

async function findReportTarget(targetType, targetId, reporterId) {
  if (targetType === 'article') {
    return dbGet('SELECT id FROM articles WHERE id = ? AND deleted_at IS NULL', [targetId]);
  }
  if (targetType === 'comment') {
    return dbGet(
      `SELECT c.id FROM comments c
       JOIN articles a ON a.id = c.article_id
       WHERE c.id = ? AND c.deleted_at IS NULL AND a.deleted_at IS NULL`,
      [targetId]
    );
  }
  if (targetType === 'user') {
    return dbGet(
      "SELECT id FROM users WHERE id = ? AND id != ? AND status != 'banned'",
      [targetId, reporterId]
    );
  }
  if (targetType === 'message') {
    return dbGet(
      `SELECT m.id FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE m.id = ?
         AND m.deleted_at IS NULL
         AND (c.participant1_id = ? OR c.participant2_id = ?)`,
      [targetId, reporterId, reporterId]
    );
  }
  return null;
}

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    if (!TARGETS.has(targetType) || !Number.isInteger(Number(targetId))) {
      return res.status(400).json({ error: '举报对象不合法' });
    }
    const cleanReason = String(reason || '').trim();
    const cleanDetails = String(details || '').trim();
    if (!cleanReason) return res.status(400).json({ error: '请选择举报原因' });
    const reasons = cleanReason.split('、').map((item) => item.trim()).filter(Boolean);
    if (reasons.length === 0 || reasons.some((item) => !REPORT_REASONS.has(item))) {
      return res.status(400).json({ error: '举报原因不合法' });
    }
    if (cleanDetails.length > 500) return res.status(400).json({ error: '补充说明不能超过500字' });

    const numericTargetId = Number(targetId);
    const target = await findReportTarget(targetType, numericTargetId, req.user.id);
    if (!target) return res.status(404).json({ error: '举报对象不存在或不可举报' });

    const existing = await dbGet(
      `SELECT id FROM reports
       WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'`,
      [req.user.id, targetType, numericTargetId]
    );
    if (existing) return res.status(409).json({ error: '你已经举报过该内容' });

    const result = await dbRun(
      'INSERT INTO reports (reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, targetType, numericTargetId, reasons.join('、'), cleanDetails || null]
    );
    res.status(201).json({ message: '举报已提交', report: { id: result.lastID } });
  } catch (err) {
    console.error('[REPORTS] 提交举报错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
