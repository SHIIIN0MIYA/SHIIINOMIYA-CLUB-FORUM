import { db } from './db';

export const messageInclude = {
  sender: { select: { id: true, name: true, role: true } },
  attachments: true,
  post: {
    select: {
      id: true,
      title: true,
      content: true,
      author: { select: { name: true } },
    },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      revokedAt: true,
      sender: { select: { name: true } },
    },
  },
} as const;

export async function requireConversationMember(
  conversationId: string,
  userId: string
) {
  const member = await db.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, role: true, image: true },
              },
            },
          },
        },
      },
    },
  });

  if (!member) {
    throw new Error('无权访问该会话');
  }

  return member;
}

export function serializeMessage<
  T extends {
    id: string;
    conversationId: string;
    senderId: string;
    type: string;
    content: string;
    postId: string | null;
    replyToId: string | null;
    createdAt: Date;
    revokedAt: Date | null;
    sender: { id: string; name: string | null; role: string };
    attachments: Array<{
      id: string;
      url: string;
      mimeType: string;
      size: number;
    }>;
    post: {
      id: string;
      title: string;
      content: string;
      author: { name: string | null };
    } | null;
    replyTo: {
      id: string;
      content: string;
      type: string;
      revokedAt: Date | null;
      sender: { name: string | null };
    } | null;
  },
>(message: T) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    revokedAt: message.revokedAt?.toISOString() ?? null,
    replyTo: message.replyTo
      ? {
          ...message.replyTo,
          revokedAt: message.replyTo.revokedAt?.toISOString() ?? null,
        }
      : null,
  };
}
