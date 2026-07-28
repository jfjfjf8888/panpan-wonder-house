# 盼盼与熊大的妙妙屋 (PanPan Wonder House)

个人 HTML5 小游戏网站：游客前台 + 管理后台 + 游戏包上传校验发布 + 匿名统计 + 广告预留。

完整需求见 `AGENT.txt`。小项目，**不使用 Docker**。

## 本地启动

1. 安装 Node.js 22+、PostgreSQL 16、MinIO Server
2. 复制环境变量：`copy .env.example .env`（或 `cp .env.example .env`）
3. 准备数据库：`powershell -File scripts/dev-setup-db.ps1`
4. 启动 MinIO（另开终端）：`powershell -File scripts/dev-minio.ps1`
5. 初始化并启动网站：

```bash
npm ci
npx prisma db push
npm run db:seed
npm run games:covers
npm run games:pack
npm run games:publish
npm run dev
```

访问：

* 前台 http://localhost:3000
* 后台 http://localhost:3000/admin （默认 `admin` / `admin123456`）
* MinIO Console http://localhost:9001

## 测试

```bash
npm test
npm run test:e2e
```

## 生产部署

```bash
npm ci
npx prisma migrate deploy
npm run db:seed
npm run build
npm run start
```

详见 `docs/DEPLOYMENT.md`。

## 示例游戏

```bash
npm run games:covers
npm run games:pack
```

ZIP 输出在 `examples/dist/`，请通过后台上传发布，或使用 `npm run games:publish`。

## 文档

* `docs/DEPLOYMENT.md`
* `docs/GAME_PACKAGE_SPEC.md`
* `AGENT.txt`
