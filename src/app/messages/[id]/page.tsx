import { notFound, redirect } from 'next/navigation';
import { getConversationSummaries } from '../../../lib/conversation-data';
import { db } from '../../../lib/db';
import {
  messageInclude,
  requireConversationMember,
  serializeMessage,
} from '../../../lib/message-data';
import { requireUser } from '../../../lib/current-user';
import ChatWorkspace from './ChatWorkspace';
import { getConversationGameData } from '../../../lib/game-data';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect('/login');
  }

  const { id } = await params;
  let membership;
  try {
    membership = await requireConversationMember(id, user.id);
  } catch {
    notFound();
  }

  const otherMembership = membership.conversation.members.find(
    (item) => item.userId !== user.id
  );
  if (!otherMembership) notFound();

  const [conversations, messages, block, reverseBlock, gameData] = await Promise.all([
    getConversationSummaries(user.id),
    db.message.findMany({
      where: {
        conversationId: id,
        hiddenBy: { none: { userId: user.id } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: messageInclude,
    }),
    db.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: otherMembership.userId,
        },
      },
    }),
    db.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: otherMembership.userId,
          blockedId: user.id,
        },
      },
    }),
    getConversationGameData(id, user.id),
  ]);

  await db.conversationMember.update({
    where: {
      conversationId_userId: { conversationId: id, userId: user.id },
    },
    data: { lastReadAt: new Date() },
  });

  return (
    <div className="relative z-10 h-[calc(100dvh-4rem)] md:px-6 md:py-6">
      <div className="mx-auto h-full max-w-6xl overflow-hidden border-white/10 bg-[#070a11]/75 backdrop-blur-xl md:rounded-2xl md:border">
        <ChatWorkspace
          currentUserId={user.id}
          conversationId={id}
          conversations={conversations}
          initialMessages={messages.reverse().map(serializeMessage)}
          otherUser={otherMembership.user}
          blockedByMe={Boolean(block)}
          blockedEitherWay={Boolean(block || reverseBlock)}
          otherLastReadAt={
            otherMembership.lastReadAt?.toISOString() ?? null
          }
          initialGame={gameData.game}
          initialGameStats={gameData.stats}
        />
      </div>
    </div>
  );
}
