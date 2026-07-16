import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/current-user';
import { getConversationGameData } from '../../../../../lib/game-data';
import { requireConversationMember } from '../../../../../lib/message-data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireConversationMember(id, user.id);
    return NextResponse.json(await getConversationGameData(id, user.id));
  } catch {
    return NextResponse.json({ error: '无权查看该对局' }, { status: 403 });
  }
}
