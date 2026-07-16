import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/current-user';
import { db } from '../../../../lib/db';
import { createRealtimeToken } from '../../../../lib/realtime';

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await db.conversationMember.findMany({
      where: { userId: user.id },
      select: { conversationId: true },
    });
    const tokenRequest = await createRealtimeToken(
      user.id,
      memberships.map((item) => item.conversationId)
    );

    if (!tokenRequest) {
      return NextResponse.json(
        { error: '实时服务尚未配置，当前使用自动同步模式' },
        { status: 503 }
      );
    }

    return NextResponse.json(tokenRequest);
  } catch {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
}
