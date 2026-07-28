# 部署说明

小项目，**不使用 Docker**。本机或服务器直接跑 Node.js、PostgreSQL、MinIO。

## 本地开发

1. 安装 Node.js 22+、PostgreSQL 16、MinIO Server
2. 复制环境变量：`cp .env.example .env`（Windows 可用 `copy`）
3. 准备数据库：`powershell -File scripts/dev-setup-db.ps1`
4. 另开终端启动 MinIO：`powershell -File scripts/dev-minio.ps1`
5. 安装依赖并初始化：

```bash
npm ci
npx prisma db push
npm run db:seed
npm run dev
```

访问：

* 前台 http://localhost:3000
* 后台 http://localhost:3000/admin
* MinIO Console http://localhost:9001

默认管理员：

```text
用户名：admin
密码：admin123456
```

请在生产环境立即修改。

## 生产部署

```bash
npm ci
npx prisma migrate deploy
npm run db:seed
npm run build
npm run start
```

生产环境务必修改：

* `SESSION_SECRET`
* `CSRF_SECRET`
* `ADMIN_PASSWORD`
* PostgreSQL / MinIO 密码
* 使用 HTTPS
* 后台 Cookie 的 Secure 标志（`NODE_ENV=production` 时自动开启）

可选在前面加 Nginx，示例见 `docs/nginx.example.conf`。

## 示例游戏打包

```bash
npm run games:covers
npm run games:pack
```

生成的 ZIP 位于 `examples/dist/`，通过后台上传发布，不要直接复制到服务器目录。

## 热度聚合

```bash
npm run stats:aggregate
```

建议每天定时执行一次。
