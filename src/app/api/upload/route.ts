// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireUser } from '../../../lib/current-user';

export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const purpose = String(formData.get('purpose') || 'content');

  if (!file) {
    return NextResponse.json({ error: '没有文件' }, { status: 400 });
  }

  // 限制文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: '只支持 JPG/PNG/GIF/WebP 图片' }, { status: 400 });
  }

  const maxSize = purpose === 'background' ? 8 : 5;
  if (file.size > maxSize * 1024 * 1024) {
    return NextResponse.json({ error: `图片不能超过 ${maxSize}MB` }, { status: 400 });
  }

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const directory =
    purpose === 'avatar' || purpose === 'background' ? `profiles/${purpose}` : 'uploads';
  const filename = `${directory}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return NextResponse.json({
    url: blob.url,
    mimeType: file.type,
    size: file.size,
  });
}
