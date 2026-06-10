# My Blog

一个极客风格的个人博客系统，前端使用 React + Vite，后端使用 Express，数据存储使用 SQLite。项目支持文章发布、评论、标签、用户登录注册、关注、通知、收藏、阅读进度、成就系统、草稿、系列文章、私信、图片上传、举报屏蔽、账号安全和内容审核等功能。

## version4.0 更新

- 新增站长后台的举报处理、内容审核、软删除恢复、用户封禁/解封和统计视图
- 新增文章、评论、用户举报能力，并加入用户屏蔽后的私信限制
- 新增 WebSocket 私信实时推送，保留轮询兜底
- 新增草稿箱、系列列表、系列详情和我的系列管理页面
- 强化账号安全，支持会话记录、退出所有设备、修改密码后旧 Token 失效和账号注销
- 优化移动端底部导航、首页信息流、侧边栏、设置页和多个空状态/确认弹窗体验

## 当前功能

- 文章：发布、编辑、删除、封面图、Markdown 预览、标签、摘要、阅读时间、阅读进度、浏览统计、热门排序和分页加载
- 写作：草稿箱、保存草稿、继续编辑草稿、发布草稿、加入系列、图片/链接快捷写作、离开页面未保存提醒
- 搜索：关键词搜索、标签筛选、作者筛选、最新/热度排序、关键词高亮和加载更多
- 互动：评论、点赞、收藏、关注、通知、私信、WebSocket 实时消息和轮询兜底
- 用户：注册登录、Google 登录、个人资料、头像、修改密码、退出所有设备、设备记录、解绑 Google、注销账号、浅色/深色主题切换
- 社区安全：举报文章/评论/用户，屏蔽用户，屏蔽后双方不能创建会话或发送私信
- 站长后台：用户封禁/解封、文章/评论/私信审核删除、举报处理、审核日志、软删除恢复、内容统计
- 系列：公开系列列表、系列详情、我的系列管理、添加/移除系列文章
- 移动端：底部导航覆盖首页、发现、写作、私信和个人页
- 游戏化：XP、等级、签到、排行榜、成就中心和成就解锁提示

## 技术栈

- 前端：React 19、Vite、React Router、Tailwind CSS、Axios、Marked、DOMPurify、lucide-react
- 后端：Node.js、Express、SQLite、JWT、bcryptjs、multer、express-rate-limit、dotenv
- 数据库：SQLite，数据库文件位于 `backend/blog.sqlite`
- 开发代理：前端开发服务器会把 `/api` 和 `/uploads` 代理到后端 `http://localhost:3001`

## 项目结构

```text
my_blog/
├── backend/              # Express 后端服务
│   ├── routes/           # API 路由
│   ├── middleware/       # 认证等中间件
│   ├── utils/            # 工具函数
│   ├── uploads/          # 用户上传文件，运行时自动创建
│   ├── database.js       # SQLite 初始化和迁移
│   ├── server.js         # 后端入口
│   ├── .env.example      # 后端环境变量示例
│   └── package.json
├── frontend/             # React + Vite 前端
│   ├── src/
│   ├── vite.config.js
│   └── package.json
├── package.json          # 根目录开发启动脚本
└── README.md
```

## 环境要求

建议使用：

- Node.js 18 或更高版本
- npm 9 或更高版本
- Git

检查命令：

```bash
node -v
npm -v
git --version
```

## 本地运行

### 1. 克隆项目

```bash
git clone https://github.com/jacktur/my_blog.git
cd my_blog
```

如果要克隆到 Windows 的 D 盘 `blog` 文件夹：

```powershell
cd D:\
git clone https://github.com/jacktur/my_blog.git blog
cd D:\blog
```

### 2. 安装依赖

根目录安装会自动安装后端和前端依赖：

```bash
npm install
```

### 3. 配置后端环境变量

复制开发环境变量示例文件：

```bash
cp backend/.env.example backend/.env
```

Windows PowerShell：

```powershell
copy backend\.env.example backend\.env
```

开发默认配置：

```env
JWT_SECRET=replace_with_a_long_random_secret
PORT=3001
NODE_ENV=development
```

开发模式启动时，后端会自动执行 [backend/seeds/developmentSeed.js](backend/seeds/developmentSeed.js)，写入测试账号和文章数据：

- `master / 123456`
- `robot7 / 123456`
- `admin / 12345678`
- `robot7` 固定拥有 3 篇测试文章，点赞数分别为 20、10、0，并写入对应测试成就

`admin` 是开发环境的站长账号，可进入 `/admin` 验证内容审核、举报处理、封禁用户和恢复误删内容等流程。

这个 seed 是幂等的，重复启动不会无限复制文章或点赞，适合每次切换到新 worktree 后直接作为项目测试环境使用。

### 4. 启动开发环境

在项目根目录运行：

```bash
npm run dev
```

启动后：

- 前端地址：`http://localhost:5173`
- 后端地址：`http://localhost:3001`
- 健康检查：`http://localhost:3001/api/health`

新建 worktree 后的最短启动流程：

```powershell
npm install
copy backend\.env.example backend\.env
npm run dev
```

## 生产构建

先构建前端：

```bash
cd frontend
npm run build
cd ..
```

然后将后端设置为生产模式并启动：

```bash
cd backend
export JWT_SECRET="替换为强随机字符串"
NODE_ENV=production node server.js
```

Windows PowerShell：

```powershell
cd backend
$env:JWT_SECRET="替换为强随机字符串"
$env:NODE_ENV="production"
node server.js
```

生产模式下，后端会托管 `frontend/dist`，并支持前端 SPA 路由。
生产环境会拒绝缺失的 `JWT_SECRET`，也会拒绝默认开发密钥；不要复用开发环境的 `backend/.env`。

## 当前 VPS 状态

Codex 当前可以通过本机 SSH 别名连接 VPS：

```bash
ssh aws-ubuntu
```

已查询到的服务器状态：

- 系统：Ubuntu on AWS
- Node.js：`v20.20.2`
- npm：`10.8.2`
- Git：`2.53.0`
- Nginx：`1.28.3`
- 项目部署目录：`/var/www/my_blog`
- 后端端口：`3001`
- 健康检查：`http://127.0.0.1:3001/api/health`
- Nginx 配置：`/etc/nginx/sites-available/myblog`
- Nginx 已启用配置：`/etc/nginx/sites-enabled/myblog`
- 当前 Nginx 状态：active
- 当前 PM2 状态：`root` 用户下的 `myblog` 进程在线，已执行 `pm2 save`
- 当前 Node 进程：PM2 管理的 `node /var/www/my_blog/backend/server.js`

当前 Nginx 将这些路径代理到后端：

- `/` -> `http://127.0.0.1:3001`
- `/api/` -> `http://127.0.0.1:3001`
- `/uploads/` -> `http://127.0.0.1:3001`

注意：服务器上的 `/var/www/my_blog` 当前属于 `root`，使用 `ubuntu` 用户直接执行 `git status` 可能出现 `dubious ownership` 提示。维护时建议使用 `sudo git -C /var/www/my_blog ...`，或者重新整理目录所有权。

## VPS 维护命令

### 连接服务器

```bash
ssh aws-ubuntu
```

### 查看项目状态

```bash
cd /var/www/my_blog
sudo git status
sudo git log -1 --oneline
```

### 查看后端是否正常

```bash
curl http://127.0.0.1:3001/api/health
ss -ltnp | grep 3001
ps -eo pid,ppid,user,args | grep node | grep my_blog
```

### 查看 Nginx 状态

```bash
sudo systemctl status nginx
sudo nginx -t
sudo cat /etc/nginx/sites-available/myblog
```

### 查看日志

当前后端由 `root` 用户下的 PM2 进程 `myblog` 管理：

```bash
cd /var/www/my_blog/backend
sudo pm2 status
sudo pm2 logs myblog
```

如果需要重建 PM2 进程：

```bash
cd /var/www/my_blog/backend
sudo pm2 delete myblog
sudo env NODE_ENV=production pm2 start server.js --name myblog
sudo pm2 save
```

也可以用进程列表确认当前监听者：

```bash
ps -eo pid,ppid,user,args | grep node | grep my_blog
```

### 更新线上代码

因为线上目录属于 `root`，当前推荐用 `sudo` 执行维护命令：

```bash
cd /var/www/my_blog
sudo git pull origin main
sudo npm install
cd backend
sudo npm install
cd ../frontend
sudo npm install
sudo npm run build
```

更新后重启后端：

```bash
cd /var/www/my_blog/backend
sudo env NODE_ENV=production pm2 restart myblog --update-env
sudo pm2 save
```

如果临时脱离 PM2 直接排查，可以先找到旧进程并停止，再重新启动：

```bash
ps -eo pid,ppid,user,args | grep node | grep my_blog
sudo kill <PID>
cd /var/www/my_blog/backend
sudo NODE_ENV=production node server.js
```

## VPS 首次部署参考

如果要在一台新服务器上重新部署：

```bash
cd /var/www
git clone https://github.com/jacktur/my_blog.git my_blog
cd my_blog
npm install
cp backend/.env.example backend/.env
nano backend/.env
cd frontend
npm run build
cd ../backend
NODE_ENV=production node server.js
```

生产环境建议配置：

```env
JWT_SECRET=强随机字符串
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://你的域名
```

私有仓库不要把 GitHub token 写进 remote URL。推荐使用 SSH key、GitHub CLI，或只在需要时输入凭据。

## 数据和上传文件

运行后会生成或使用这些运行时文件：

- SQLite 数据库：`backend/blog.sqlite`
- SQLite WAL 文件：`backend/blog.sqlite-wal`、`backend/blog.sqlite-shm`
- 上传目录：`backend/uploads/`
- 头像上传：`backend/uploads/avatars/custom/`
- 文章封面：`backend/uploads/covers/`

数据库会在启动时自动创建和迁移这些核心表：

- 内容：`articles`、`comments`、`tags`、`article_tags`、`drafts`、`series`、`series_articles`
- 用户与互动：`users`、`follows`、`likes`、`bookmarks`、`notifications`、`reading_progress`
- 游戏化：`xp_transactions`、`achievements`、`user_achievements`、`activity_feed`
- 私信与安全：`conversations`、`messages`、`conversation_readers`、`blocked_users`、`reports`、`moderation_actions`、`auth_sessions`

管理员删除文章、评论和私信时默认是软删除，会写入 `moderation_actions`，可在后台审核日志中恢复。

这些文件通常不应该直接提交到 GitHub。部署或迁移服务器时，要记得备份数据库和上传目录。

备份示例：

```bash
cd /var/www/my_blog
tar -czvf my_blog_backup.tar.gz backend/blog.sqlite backend/blog.sqlite-wal backend/blog.sqlite-shm backend/uploads
```

## 常见问题

### 1. clone 后能不能直接运行？

不能保证。clone 只是下载代码，还需要安装依赖、配置 `.env`、初始化数据库并启动服务。

### 2. 前端页面打开后接口请求失败

检查后端是否启动：

```bash
curl http://localhost:3001/api/health
```

开发环境中，Vite 会把 `/api` 代理到 `http://localhost:3001`，所以后端必须保持运行。

### 3. 登录注册失败

检查 `backend/.env` 是否存在，尤其是 `JWT_SECRET` 是否已配置。

### 4. 图片上传失败

检查上传目录权限：

```bash
ls -la backend/uploads
```

Linux 服务器上可以调整目录权限：

```bash
chmod -R 755 backend/uploads
```

### 5. 服务器访问不到网站

依次检查：

```bash
curl http://127.0.0.1:3001/api/health
sudo systemctl status nginx
sudo nginx -t
ss -ltnp | grep 3001
sudo ufw status
```

确认云服务器安全组或防火墙已开放 `80`、`443` 端口。

### 6. Git 提示 dubious ownership

这是因为 `/var/www/my_blog` 当前属于 `root`，但你用 `ubuntu` 用户执行 Git。可以临时使用：

```bash
sudo git -C /var/www/my_blog status
```

也可以把目录所有权改给 `ubuntu`，但改之前要确认不会影响 Nginx、上传目录和现有进程：

```bash
sudo chown -R ubuntu:ubuntu /var/www/my_blog
```

## 开发命令汇总

```bash
# 根目录同时启动前后端
npm run dev

# 单独启动后端
npm run dev:backend

# 单独启动前端
npm run dev:frontend

# 前端构建
cd frontend && npm run build

# 前端预览
cd frontend && npm run preview
```

## 维护建议

- 不要把 `backend/.env` 提交到仓库
- 不要把生产环境的 `JWT_SECRET` 写进 README 或截图
- 不要把 GitHub token 写进 `git remote -v`
- 定期备份 `backend/blog.sqlite`、`backend/blog.sqlite-wal`、`backend/blog.sqlite-shm` 和 `backend/uploads/`
- 生产环境建议使用 PM2 或 systemd 管理 Node 服务
- 使用 Nginx 代理域名和 HTTPS
- 修改后端代码后需要重启 Node 服务
- 生产环境要替换开发账号密码，尤其是 `admin / 12345678`
- 不要把本地开发数据库 `backend/blog.sqlite` 原样当生产库使用，除非已经替换所有开发账号密码
- 账号安全依赖 `users.token_version`，修改密码或退出所有设备会让旧 JWT 失效
- WebSocket 使用 `/ws?token=<JWT>`，开发环境 Vite 已代理 `/ws` 到后端
- 后台审核删除是软删除；真正清理数据库前先确认不需要恢复

## License

当前仓库尚未声明开源许可证。如需公开分发或允许他人使用，建议补充 `LICENSE` 文件。
