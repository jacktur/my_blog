# My Blog

一个极客风格的个人博客系统，前端使用 React + Vite，后端使用 Express，数据存储使用 SQLite。项目支持文章发布、评论、标签、用户登录注册、关注、通知、收藏、阅读进度、成就系统、草稿、系列文章、私信和图片上传等功能。

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

这个项目分为根目录、前端、后端三部分，需要分别安装依赖：

```bash
npm install
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### 3. 配置后端环境变量

复制环境变量示例文件：

```bash
cd backend
cp .env.example .env
cd ..
```

Windows PowerShell：

```powershell
cd backend
copy .env.example .env
cd ..
```

建议修改 `backend/.env` 中的 `JWT_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

示例配置：

```env
JWT_SECRET=请替换为强随机字符串
PORT=3001
NODE_ENV=development
```

### 4. 启动开发环境

在项目根目录运行：

```bash
npm run dev
```

启动后：

- 前端地址：`http://localhost:5173`
- 后端地址：`http://localhost:3001`
- 健康检查：`http://localhost:3001/api/health`

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
NODE_ENV=production node server.js
```

Windows PowerShell：

```powershell
cd backend
$env:NODE_ENV="production"
node server.js
```

生产模式下，后端会托管 `frontend/dist`，并支持前端 SPA 路由。

## VPS 部署参考

以下命令适用于常见 Linux VPS，例如 Ubuntu。请把服务器地址、用户名、项目路径替换为自己的实际信息。

### 1. 连接 VPS

```bash
ssh 用户名@服务器IP
```

### 2. 检查服务器环境

```bash
node -v
npm -v
git --version
pm2 -v
nginx -v
```

如果没有安装 Node.js，建议使用 NodeSource 或 nvm 安装 Node.js 18+。

### 3. 拉取代码

```bash
cd /var/www
git clone https://github.com/jacktur/my_blog.git my_blog
cd my_blog
```

如果仓库是私有仓库，需要先配置 GitHub SSH Key，或使用有权限的访问方式。

### 4. 安装依赖并配置环境变量

```bash
npm install
cd backend
npm install
cp .env.example .env
nano .env
cd ../frontend
npm install
npm run build
cd ..
```

生产环境建议配置：

```env
JWT_SECRET=强随机字符串
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://你的域名
```

### 5. 使用 PM2 启动后端

```bash
cd /var/www/my_blog/backend
pm2 start server.js --name my-blog
pm2 save
pm2 startup
```

查看状态和日志：

```bash
pm2 status
pm2 logs my-blog
```

### 6. Nginx 反向代理示例

假设域名是 `example.com`，后端运行在 `3001` 端口：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

保存后检查并重载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

如果开启 HTTPS，可以使用 Certbot：

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

## 数据和上传文件

运行后会生成或使用这些运行时文件：

- SQLite 数据库：`backend/blog.sqlite`
- 上传目录：`backend/uploads/`
- 头像上传：`backend/uploads/avatars/custom/`
- 文章封面：`backend/uploads/covers/`

这些文件通常不应该直接提交到 GitHub。部署或迁移服务器时，要记得备份数据库和上传目录。

备份示例：

```bash
tar -czvf my_blog_backup.tar.gz backend/blog.sqlite backend/uploads
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
pm2 status
pm2 logs my-blog
sudo nginx -t
sudo systemctl status nginx
sudo ufw status
```

确认安全组或防火墙已开放 `80`、`443` 端口。

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
- 定期备份 `backend/blog.sqlite` 和 `backend/uploads/`
- 生产环境建议使用 PM2 管理 Node 服务
- 使用 Nginx 代理域名和 HTTPS
- 修改后端代码后需要重启 PM2 服务

## License

当前仓库尚未声明开源许可证。如需公开分发或允许他人使用，建议补充 `LICENSE` 文件。
