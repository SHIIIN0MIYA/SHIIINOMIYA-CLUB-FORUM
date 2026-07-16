import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/current-user';
import { db } from '../../../../lib/db';
import {
  messageInclude,
  requireConversationMember,
  serializeMessage,
} from '../../../../lib/message-data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireConversationMember(id, user.id);

    const messages = await db.message.findMany({
      where: {
        conversationId: id,
        hiddenBy: { none: { userId: user.id } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: messageInclude,
    });

    return NextResponse.json({
      messages: messages.reverse().map(serializeMessage),
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '无法读取消息' },
      { status: 403 }
    );
  }
}
