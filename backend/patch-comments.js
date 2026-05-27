const fs = require('fs');
let content = fs.readFileSync(__dirname + '/../routes/comments.js', 'utf8');
const oldStr = `    }\n\n    res.status(201).json({ message: "评论发表成功", comment: newComment });`;
const newStr = `    }\n\n    // XP + activity for commenting\n    grantXP(userId, 10, 'comment', 'article', id);\n    addActivity(userId, 'comment', '评论了文章 #' + id, 'article', id);\n\n    res.status(201).json({ message: '评论发表成功', comment: newComment });`;
if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(__dirname + '/../routes/comments.js', content);
  console.log('Updated comments.js successfully');
} else {
  console.log('Pattern not found');
  // Debug: show the actual content around that area
  const idx = content.indexOf('res.status(201).json');
  if (idx >= 0) console.log('Found at:', idx, 'Context:', content.substring(idx-60, idx+60));
}
