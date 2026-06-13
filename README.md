# My Blog

一个部署在 `277596.xyz` 的个人博客系统。前端使用 React + Vite，后端使用 Express，数据存储使用 SQLite，支持文章、评论、标签、登录注册、Google 登录、关注、通知、收藏、阅读进度、成就系统、草稿、系列文章、私信、举报屏蔽、站长后台和图片上传。

## version4.1 更新

- 生产域名调整为前端 `https://277596.xyz`，API `https://api.277596.xyz`
- 前端请求支持 `VITE_API_ORIGIN`，Google 登录入口会跳到 API 域名
- WebSocket 私信支持跨 API 域名，生产环境默认使用 `wss://api.277596.xyz/ws`
- 后端环境变量文档补齐 `FRONTEND_URL`、`GOOGLE_CALLBACK_URL` 和 `CORS_ORIGIN`
- README 按当前域名、VPS、PM2 和 Nginx 部署方式重写

## 当前域名

- 网站前端：`https://277596.xyz`
- API 后端：`https://api.277596.xyz`
- Google 登录入口：`https://api.277596.xyz/auth/google`
- Google OAuth 回调：`https://api.277596.xyz/auth/google/callback`
- 健康检查：`https://api.277596.xyz/api/health`

Google Cloud Console 里需要这样填写：

```text
Authorized JavaScript origins:
https://277596.xyz

Authorized redirect URIs:
https://api.277596.xyz/auth/google/callback
```

注意：`Authorized redirect URIs` 必须是完整回调地址。只填 `https://api.277596.xyz` 会和代码发给 Google 的 `redirect_uri` 不一致，登录时会出现 `redirect_uri_mismatch`。

## 功能

- 文章：发布、编辑、删除、封面图、Markdown 预览、标签、摘要、阅读时间、阅读进度、浏览统计、热门排序和分页加载
- 写作：草稿箱、保存草稿、继续编辑草稿、发布草稿、加入系列、图片/链接快捷写作、离开页面未保存提醒
- 搜索：关键词搜索、标签筛选、作者筛选、最新/热度排序、关键词高亮和加载更多
- 用户：邮箱注册登录、Google 登录、个人资料、头像、修改密码、退出所有设备、设备记录、解绑 Google、注销账号、浅色/深色主题
- 互动：评论、点赞、收藏、关注、通知、私信、WebSocket 实时消息和轮询兜底
- 社区安全：举报文章/评论/用户，屏蔽用户，屏蔽后双方不能创建会话或发送私信
- 站长后台：用户封禁/解封、文章/评论/私信审核删除、举报处理、审核日志、软删除恢复、内容统计
- 系列：公开系列列表、系列详情、我的系列管理、添加/移除系列文章
- 游戏化：XP、等级、签到、排行榜、成就中心和成就解锁提示

## 技术栈

- 前端：React 19、Vite、React Router、Tailwind CSS、Axios、Marked、DOMPurify、lucide-react
- 后端：Node.js、Express、SQLite、JWT、bcryptjs、multer、express-rate-limit、google-auth-library、ws
- 数据库：SQLite，生产数据库位于 `backend/blog.sqlite`
- 部署：Nginx + PM2，后端监听 `127.0.0.1:3001`

## 项目结构

```text
my_blog/
├── backend/
│   ├── routes/
│   ├── middleware/
│   ├── seeds/
│   ├── uploads/
│   ├── database.js
│   ├── realtime.js
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── vite.config.js
│   └── .env.example
├── scripts/
├── package.json
└── README.md
```

## 本地运行

```bash
git clone https://github.com/jacktur/my_blog.git
cd my_blog
npm install
cp backend/.env.example backend/.env
npm run dev
```

Windows PowerShell：

```powershell
git clone https://github.com/jacktur/my_blog.git
cd my_blog
npm.cmd install
copy backend\.env.example backend\.env
npm.cmd run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`
- 健康检查：`http://localhost:3001/api/health`

开发环境中前端可以不设置 `VITE_API_ORIGIN`，Vite 会把 `/api`、`/auth`、`/uploads` 和 `/ws` 代理到 `http://localhost:3001`。

开发 seed 会在 `NODE_ENV=development` 时自动写入测试账号和测试文章：

- `master / 123456`
- `robot7 / 123456`
- `admin / 12345678`

`admin` 是开发环境站长账号，可进入 `/admin` 验证审核、举报、封禁和恢复流程。

## 环境变量

### 后端生产环境

服务器文件：`/var/www/my_blog/backend/.env`

```env
JWT_SECRET=替换为强随机字符串
PORT=3001
NODE_ENV=production

FRONTEND_URL=https://277596.xyz
CORS_ORIGIN=https://277596.xyz

GOOGLE_CLIENT_ID=你的 Google OAuth Client ID
GOOGLE_CLIENT_SECRET=你的 Google OAuth Client Secret
GOOGLE_CALLBACK_URL=https://api.277596.xyz/auth/google/callback

SMTP_USER=你的 Gmail 地址
SMTP_PASS=你的 Gmail App Password
```

不要把 `backend/.env` 提交到 GitHub。`JWT_SECRET`、`GOOGLE_CLIENT_SECRET`、`SMTP_PASS` 都是生产密钥。

### 前端生产构建

服务器文件：`/var/www/my_blog/frontend/.env.production`

```env
VITE_API_ORIGIN=https://api.277596.xyz
```

`VITE_WS_ORIGIN` 可不填。未设置时，前端会自动把 `https://api.277596.xyz` 转成 `wss://api.277596.xyz`。

## 生产构建

```bash
npm install
cd frontend
npm run build
cd ../backend
NODE_ENV=production node server.js
```

生产模式下，后端会托管 `frontend/dist`，同时提供 `/api`、`/auth`、`/uploads` 和 `/ws`。

## 当前 VPS

Codex 本机可通过 SSH 别名连接：

```bash
ssh aws-ubuntu
```

当前服务器状态：

- 系统：AWS Ubuntu
- 项目目录：`/var/www/my_blog`
- 后端端口：`3001`
- 进程管理：root 用户下的 PM2 进程 `myblog`
- Nginx 配置：`/etc/nginx/sites-available/myblog`
- 本机健康检查：`http://127.0.0.1:3001/api/health`

常用检查：

```bash
curl http://127.0.0.1:3001/api/health
sudo pm2 status
sudo pm2 logs myblog
sudo nginx -t
sudo systemctl status nginx
```

## Nginx 参考配置

`277596.xyz` 服务前端页面，`api.277596.xyz` 服务 API、OAuth、上传文件和 WebSocket。

```nginx
server {
    listen 80;
    server_name 277596.xyz www.277596.xyz api.277596.xyz;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

HTTPS 证书签发后，Nginx 应继续把 `X-Forwarded-Proto` 传给后端。

## 部署流程

本仓库的推荐流程是：本地改代码 -> 推送 GitHub -> 同步到 VPS -> 构建前端 -> 重启 PM2。

```bash
git status
git add -A
git commit -m "version4.1"
git push origin version/4.0
```

服务器上：

```bash
cd /var/www/my_blog
sudo npm install
sudo npm install --prefix backend
sudo npm install --prefix frontend
sudo sh -c 'echo VITE_API_ORIGIN=https://api.277596.xyz > frontend/.env.production'
cd frontend
sudo npm run build
cd ../backend
sudo pm2 restart myblog --update-env
sudo pm2 save
```

如果服务器目录不是 git checkout，而是直接同步文件，部署时不要覆盖这些运行时数据：

- `backend/.env`
- `backend/blog.sqlite`
- `backend/blog.sqlite-wal`
- `backend/blog.sqlite-shm`
- `backend/uploads/`
- `backend/node_modules/`
- `frontend/node_modules/`
- `frontend/dist/` 可由服务器重新构建生成

## 数据备份

```bash
cd /var/www/my_blog
sudo tar -czvf my_blog_backup_$(date +%Y%m%d-%H%M%S).tar.gz \
  backend/blog.sqlite \
  backend/blog.sqlite-wal \
  backend/blog.sqlite-shm \
  backend/uploads
```

## 常见问题

### Google 登录跳转失败

先确认 Google Cloud Console 的配置是：

```text
Authorized JavaScript origins: https://277596.xyz
Authorized redirect URIs: https://api.277596.xyz/auth/google/callback
```

再确认服务器后端环境变量：

```bash
sudo grep -nE 'FRONTEND_URL|CORS_ORIGIN|GOOGLE_CALLBACK_URL|GOOGLE_CLIENT_ID' /var/www/my_blog/backend/.env
```

修改 `.env` 后必须重启：

```bash
sudo pm2 restart myblog --update-env
```

### 前端请求仍然打到旧域名

确认 `frontend/.env.production` 存在并重新构建：

```bash
cat /var/www/my_blog/frontend/.env.production
cd /var/www/my_blog/frontend
sudo npm run build
sudo pm2 restart myblog --update-env
```

### API 正常但 WebSocket 不通

检查 Nginx 是否对 `/ws` 设置了 Upgrade 头：

```bash
sudo nginx -T | grep -A12 'location /ws'
```

### 登录注册失败

检查 `JWT_SECRET`、`SMTP_USER`、`SMTP_PASS` 和 Google OAuth 变量是否存在。生产环境不能使用默认开发密钥。

### Git 提示 dubious ownership

线上目录当前属于 `root` 时，用：

```bash
sudo git -C /var/www/my_blog status
```

或者在确认不会影响运行权限后整理所有权：

```bash
sudo chown -R ubuntu:ubuntu /var/www/my_blog
```

## 维护建议

- 不要提交 `.env`、SQLite 数据库、上传文件和密钥
- 每次改后端代码后重启 PM2
- 每次改前端环境变量后重新 `npm run build`
- 定期备份 SQLite 和 `backend/uploads`
- 生产环境及时替换开发账号密码，尤其是 `admin / 12345678`
- GitHub 远端不要写入 token，服务器拉取私有仓库时优先使用 SSH key 或 GitHub CLI

## License

当前仓库尚未声明开源许可证。如需公开分发或允许他人使用，建议补充 `LICENSE` 文件。
