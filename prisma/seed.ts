// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@forum.local' },
    update: {},
    create: {
      name: '管理员',
      email: 'admin@forum.local',
      passwordHash: 'seeded',
    },
  });

  await prisma.post.createMany({
    data: [
      {
        title: '欢迎来到 SHIIIINOMIYA 论坛',
        content: '这是一个技术同好交流社区，欢迎大家分享知识、讨论问题。',
        tags: '公告,社区',
        authorId: user.id,
      },
      {
        title: 'React 19 新特性尝鲜',
        content: 'Server Components 稳定了，Actions 也更方便了……',
        tags: 'React,前端',
        authorId: user.id,
      },
      {
        title: '你们平时用什么笔记软件？',
        content: 'Obsidian、Notion、Logseq……大家都用哪个？',
        tags: '工具,效率',
        authorId: user.id,
      },
    ],
  });

  console.log('Seed data inserted successfully.');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });