import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/current-user';
import { db } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (query.length < 1) return NextResponse.json({ users: [] });

    const users = await db.user.findMany({
      where: {
        id: { not: user.id },
        role: { not: 'banned' },
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, name: true, image: true, role: true },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
}
