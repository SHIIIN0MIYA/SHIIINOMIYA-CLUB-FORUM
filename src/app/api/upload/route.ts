// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '没有文件' }, { status: 400 });
  }

  // 限制文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: '只支持 JPG/PNG/GIF/WebP 图片' }, { status: 400 });
  }

  // 限制文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: '图片不能超过 5MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.type.split('/')[1]}`;

  // 保存到 public/uploads
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return NextResponse.json({
    url: `/uploads/${filename}`,
  });
}