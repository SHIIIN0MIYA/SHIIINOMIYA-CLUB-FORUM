import { db } from './db';

export async function getConversationSummaries(userId: string) {
  const memberships = await db.conversationMember.findMany({
    where: { userId, hiddenAt: null },
    orderBy: { conversation: { updatedAt: 'desc' } },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, image: true, role: true },
              },
            },
          },
          messages: {
            where: {
              hiddenBy: { none: { userId } },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              type: true,
              createdAt: true,
              revokedAt: true,
              senderId: true,
            },
          },
        },
      },
    },
  });

  return Promise.all(
    memberships.map(async (membership) => {
      const other = membership.conversation.members.find(
        (item) => item.userId !== userId
      )?.user;
      const lastMessage = membership.conversation.messages[0] ?? null;
      const unreadCount = await db.message.count({
        where: {
          conversationId: membership.conversationId,
          senderId: { not: userId },
          createdAt: membership.lastReadAt
            ? { gt: membership.lastReadAt }
            : undefined,
          hiddenBy: { none: { userId } },
        },
      });

      return {
        id: membership.conversationId,
        updatedAt: membership.conversation.updatedAt.toISOString(),
        other: other ?? {
          id: '',
          name: '未知用户',
          image: null,
          role: 'banned',
        },
        lastMessage: lastMessage
          ? {
              ...lastMessage,
              createdAt: lastMessage.createdAt.toISOString(),
              revokedAt: lastMessage.revokedAt?.toISOString() ?? null,
            }
          : null,
        unreadCount,
      };
    })
  );
}

export async function getUnreadMessageCount(userId: string) {
  const memberships = await db.conversationMember.findMany({
    where: { userId, hiddenAt: null },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  const counts = await Promise.all(
    memberships.map((membership) =>
      db.message.count({
        where: {
          conversationId: membership.conversationId,
          senderId: { not: userId },
          createdAt: membership.lastReadAt
            ? { gt: membership.lastReadAt }
            : undefined,
          hiddenBy: { none: { userId } },
        },
      })
    )
  );

  return counts.reduce((total, count) => total + count, 0);
}
