// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    // 检查是否已有数据，避免重复插入
    const existingUser = await db.user.findFirst();
    if (existingUser) {
      return NextResponse.json({ message: '数据库已有数据，跳过种子。' });
    }

    // 创建用户
    const user = await db.user.create({
      data: {
        name: '管理员',
        email: 'admin@forum.local',
        passwordHash: 'seeded',
      },
    });

    // 创建示例帖子
    await db.post.createMany({
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

    return NextResponse.json({ message: '种子数据插入成功！' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}