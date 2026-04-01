# 铃华2026 · 校外研修｜关系推演稿

基于 Next.js：力导向关系图、头像裁剪、**可自定义头像金边颜色**（色盘 + 取色器）、有向关系批注。**无登录**：访客均可增删改（可选 `SITE_PASSWORD` 写保护）。UI 为黑 / 米色 / 金色调，带轻噪点与竖线底纹。

## 本地开发

1. 复制 `.env.example` 为 `.env.local`，填入 `DATABASE_URL` 与 `BLOB_READ_WRITE_TOKEN`（Blob 存储需为 **Public**，否则上传会失败）。**只需维护 `.env.local` 即可**：`drizzle.config.ts` 会加载 `.env` 与 `.env.local`，`npm run db:push` 等 CLI 可读到 `DATABASE_URL`。
2. 在 **`website` 目录**下打开终端，同步数据库结构：

```bash
npm run db:push
```

若曾在 **PowerShell** 里遇到「禁止运行脚本」，可用 `npm.cmd run db:push`，或改用 **cmd**，或将执行策略设为 `RemoteSigned`（仅当前用户）。

3. 启动：

```bash
npm run dev
```

从旧版（含 `edit_secret_hash` 列）升级时，`db:push` 会应用 `drizzle/` 中迁移并删除该列。

## 部署到 Vercel + GitHub

1. 将仓库推送到 GitHub，在 [Vercel](https://vercel.com) 导入该仓库。
2. 在 Vercel 创建 **Neon** 或 **Postgres** 集成，把 `DATABASE_URL` 配到环境变量。
3. 在 Storage 中创建 **Blob**（**公开读**），将 Read/Write Token 设为 `BLOB_READ_WRITE_TOKEN`。
4. （可选）设置 `SITE_PASSWORD`，与页面顶栏「站点密码」一致时才能写入。
5. 部署完成后对生产库执行 `npm run db:push`（本地指向生产 `DATABASE_URL`）或运行 `drizzle/` 下 SQL 迁移。

## 脚本

| 命令            | 说明                    |
| --------------- | ----------------------- |
| `npm run dev`   | 开发服务器              |
| `npm run build` | 生产构建                |
| `npm run db:push` | 将 schema 推送到数据库 |
| `npm run db:generate` | 生成迁移 SQL      |

## 技术说明

- 头像经浏览器内 **正方形裁剪** 后上传；**`ring_color`** 存每位角色头像外圈描边色（`#RRGGBB`）。
- 关系边为「从 A 指向 B」的批注；删除角色会级联删除相关连线。
