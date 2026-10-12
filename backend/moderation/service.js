const { dbGet, dbRun } = require('../database');
const { grantXP, checkAchievements, addActivity } = require('../routes/gamification');
const { analyzeArticle } = require('./engine');

function validateArticle(title, content, tags) {
  if (typeof title !== 'string' || !title.trim() || title.length > 200) return '标题长度需在 1-200 个字符之间';
  if (typeof content !== 'string' || !content.trim() || content.length > 50000) return '内容长度需在 1-50000 个字符之间';
  if (tags !== undefined && (!Array.isArray(tags) || tags.length > 20 || tags.some((tag) => typeof tag !== 'string' || tag.length > 40))) return '标签需为不超过20项的文本数组，每项不超过40字';
  return null;
}

function moderationMessage(status) {
  return { published: '文章已发布', pending: '文章已提交，等待人工审核', held: '文章暂缓发布，等待管理员复核', rejected: '审核未通过，请修改后重新提交' }[status];
}

async function rewardPublication(articleId) {
  const article = await dbGet("SELECT * FROM articles WHERE id = ? AND moderation_status = 'published' AND deleted_at IS NULL", [articleId]);
  if (!article) return null;
  const claim = await dbRun("UPDATE articles SET publication_rewarded = 1 WHERE id = ? AND publication_rewarded = 0 AND moderation_status = 'published' AND moderation_revision = ? AND deleted_at IS NULL", [articleId, article.moderation_revision]);
  if (!claim.changes) return null;
  const xp = await grantXP(article.user_id, 50, 'publish_article', 'article', article.id);
  await addActivity(article.user_id, 'publish_article', '发布了文章「' + article.title + '」', 'article', article.id, { title: article.title });
  const achievements = await checkAchievements(article.user_id, 'publish_article', { hour: new Date().getHours() });
  return { xp, achievements };
}

module.exports = { validateArticle, moderationMessage, rewardPublication, analyzeArticle };
