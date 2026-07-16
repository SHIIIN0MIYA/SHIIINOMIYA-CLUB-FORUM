# SHIIIINOMIYA 论坛

一个使用 Next.js App Router 构建的小型中文论坛，支持账号、帖子、Markdown、
评论、点赞、通知、图片上传和管理员操作。

## 技术栈

- Next.js 16 / React 19
- NextAuth 5 Credentials 登录
- Prisma 5
- PostgreSQL（Neon）
- Tailwind CSS 3

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
copy .env.example .env.local
npm run db:deploy
npm run db:seed
npm run dev
```

访问 `http://localhost:3000`。

`AUTH_TRUST_HOST=true` 用于本地生产模式和受信任的反向代理环境。正式部署时应同时
设置正确的 `AUTH_URL`，并确保平台不会接受未经验证的 Host 请求。

开发 seed 默认管理员：

- 邮箱：`admin@forum.local`
- 密码：`ChangeMe123!`

可通过 `.env` 中的 `SEED_ADMIN_PASSWORD` 修改初始密码。真实部署时必须使用强密码。

## 常用命令

```bash
npm run lint
npm run typecheck
npm run build
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

修改 `prisma/schema.prisma` 后，本地开发使用 `npm run db:migrate` 创建迁移。
生产环境只运行 `npm run db:deploy`。

## 托管服务

- 数据库：Neon Serverless Postgres，通过 Vercel Marketplace 连接。
- 图片：Vercel Blob 公共存储。
- 私信：Neon 持久化消息，Vercel Blob 保存图片，Ably 提供实时事件。

运行 `vercel env pull .env.local` 可以拉取开发环境所需的数据库和 Blob 凭据。

## 站内私信

私信支持一对一文字、图片、帖子分享、引用回复、两分钟内撤回、个人隐藏、屏蔽、举报、未读数和已读状态。

配置 `ABLY_API_KEY` 后启用实时消息与输入状态；未配置时会自动使用 3 秒同步，不影响消息持久化。生产部署前执行：

```bash
npm run db:deploy
```

管理员可以在 `/admin/messages` 查看和检索私信、处理举报。该权限必须在注册页和隐私说明中向用户公开。
