const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'backend', 'routes', 'comments.js');
let content = fs.readFileSync(file, 'utf8');
const oldStr = `    }\n\n    res.status(201).json({ message: "评论发表成功", comment: newComment });`;
const newStr = `    }\n\n    // XP + activity for commenting\n    grantXP(userId, 10, 'comment', 'article', id);\n    addActivity(userId, 'comment', '评论了文章 #' + id, 'article', id);\n\n    res.status(201).json({ message: '评论发表成功', comment: newComment });`;
if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(file, content);
  console.log('Updated comments.js successfully');
} else {
  console.log('Pattern not found');
  const idx = content.indexOf('res.status(201).json');
  if (idx >= 0) console.log('Context:', JSON.stringify(content.substring(Math.max(0,idx-80), idx+80)));
}
