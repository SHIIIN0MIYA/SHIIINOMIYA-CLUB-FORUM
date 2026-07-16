'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../../lib/db';
import { requireAdmin, requireUser } from '../../lib/current-user';
import { messageInclude, requireConversationMember } from '../../lib/message-data';
import { publishRealtime } from '../../lib/realtime';

export type MessageAttachmentInput = {
  url: string;
  mimeType: string;
  size: number;
};

export type SendMessageInput = {
  conversationId: string;
  content?: string;
  postId?: string | null;
  replyToId?: string | null;
  attachments?: MessageAttachmentInput[];
};

const pairKeyFor = (firstId: string, secondId: string) =>
  [firstId, secondId].sort().join(':');

async function assertNotBlocked(firstId: string, secondId: string) {
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: firstId, blockedId: secondId },
        { blockerId: secondId, blockedId: firstId },
      ],
    },
  });

  if (block) {
    throw new Error('你们之间已启用屏蔽，无法发送新消息');
  }
}

export async function startConversation(targetUserId: string, postId?: string) {
  const user = await requireUser();
  if (user.id === targetUserId) throw new Error('不能给自己发送私信');

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, messagingPreference: true },
  });
  if (!target || target.role === 'banned') throw new Error('该用户当前不可私信');

  await assertNotBlocked(user.id, targetUserId);
  const pairKey = pairKeyFor(user.id, targetUserId);

  if (target.messagingPreference === 'NONE') {
    throw new Error('该用户已关闭陌生私信');
  }
  if (target.messagingPreference === 'INTERACTIONS') {
    const [existingConversation, interaction] = await Promise.all([
      db.conversation.findUnique({ where: { pairKey }, select: { id: true } }),
      db.user.findFirst({
        where: {
          id: targetUserId,
          OR: [
            { posts: { some: { comments: { some: { authorId: user.id } } } } },
            { posts: { some: { likes: { some: { userId: user.id } } } } },
            { comments: { some: { post: { authorId: user.id } } } },
            { likes: { some: { post: { authorId: user.id } } } },
          ],
        },
        select: { id: true },
      }),
    ]);
    if (!existingConversation && !interaction) {
      throw new Error('该用户仅接收互动过的用户发来的私信');
    }
  }

  const conversation = await db.conversation.upsert({
    where: { pairKey },
    update: {},
    create: {
      pairKey,
      members: {
        create: [{ userId: user.id }, { userId: targetUserId }],
      },
    },
  });

  if (postId) {
    const existingPostMessage = await db.message.findFirst({
      where: {
        conversationId: conversation.id,
        senderId: user.id,
        postId,
      },
    });
    if (!existingPostMessage) {
      await sendMessage({
        conversationId: conversation.id,
        postId,
        content: '分享了一篇帖子',
      });
    }
  }

  revalidatePath('/messages');
  return { conversationId: conversation.id };
}

export async function sendMessage(input: SendMessageInput) {
  const user = await requireUser();
  const content = String(input.content || '').trim();
  const attachments = (input.attachments || []).slice(0, 4);

  if (content.length > 5_000) throw new Error('单条消息不能超过 5000 个字符');
  if (!content && attachments.length === 0 && !input.postId) {
    throw new Error('消息内容不能为空');
  }
  if (attachments.length > 4) throw new Error('每条消息最多包含 4 张图片');
  for (const attachment of attachments) {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(attachment.mimeType)) {
      throw new Error('图片格式不受支持');
    }
    if (attachment.size > 5 * 1024 * 1024) {
      throw new Error('单张图片不能超过 5MB');
    }
    if (!attachment.url.startsWith('https://')) {
      throw new Error('图片地址无效');
    }
  }

  const member = await requireConversationMember(input.conversationId, user.id);
  const otherMember = member.conversation.members.find(
    (item) => item.userId !== user.id
  );
  if (!otherMember || otherMember.user.role === 'banned') {
    throw new Error('对方账号当前不可接收消息');
  }

  await assertNotBlocked(user.id, otherMember.userId);

  const recentCount = await db.message.count({
    where: {
      senderId: user.id,
      createdAt: { gte: new Date(Date.now() - 10_000) },
    },
  });
  if (recentCount >= 5) throw new Error('发送过于频繁，请稍后再试');

  if (input.postId) {
    const post = await db.post.findUnique({
      where: { id: input.postId },
      select: { id: true },
    });
    if (!post) throw new Error('分享的帖子不存在');
  }

  if (input.replyToId) {
    const replyTarget = await db.message.findFirst({
      where: {
        id: input.replyToId,
        conversationId: input.conversationId,
      },
      select: { id: true },
    });
    if (!replyTarget) throw new Error('引用的消息不存在');
  }

  const type = input.postId
    ? 'POST'
    : attachments.length > 0
      ? 'IMAGE'
      : 'TEXT';

  const message = await db.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: user.id,
        type,
        content,
        postId: input.postId || null,
        replyToId: input.replyToId || null,
        attachments: {
          create: attachments.map((attachment) => ({
            url: attachment.url,
            mimeType: attachment.mimeType,
            size: attachment.size,
          })),
        },
      },
      include: messageInclude,
    });

    await tx.conversation.update({
      where: { id: input.conversationId },
      data: {
        updatedAt: new Date(),
        members: {
          updateMany: {
            where: {},
            data: { hiddenAt: null },
          },
        },
      },
    });

    await tx.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: input.conversationId,
          userId: user.id,
        },
      },
      data: { lastReadAt: created.createdAt },
    });

    return created;
  });

  await Promise.all([
    publishRealtime(
      `private:conversation:${input.conversationId}`,
      'message.created',
      { conversationId: input.conversationId, messageId: message.id }
    ),
    publishRealtime(`private:user:${otherMember.userId}`, 'message.created', {
      conversationId: input.conversationId,
      messageId: message.id,
    }),
  ]);

  revalidatePath('/messages');
  revalidatePath(`/messages/${input.conversationId}`);
  return { id: message.id };
}

export async function markConversationRead(conversationId: string) {
  const user = await requireUser();
  await requireConversationMember(conversationId, user.id);
  const readAt = new Date();

  await db.conversationMember.update({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
    data: { lastReadAt: readAt },
  });

  await publishRealtime(
    `private:conversation:${conversationId}`,
    'conversation.read',
    { conversationId, userId: user.id, readAt: readAt.toISOString() }
  );
}

export async function revokeMessage(messageId: string) {
  const user = await requireUser();
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.senderId !== user.id) throw new Error('无权撤回该消息');
  if (message.revokedAt) return;
  if (Date.now() - message.createdAt.getTime() > 2 * 60 * 1000) {
    throw new Error('消息发送超过 2 分钟，无法撤回');
  }

  await db.message.update({
    where: { id: messageId },
    data: { revokedAt: new Date(), content: '' },
  });

  await publishRealtime(
    `private:conversation:${message.conversationId}`,
    'message.revoked',
    { conversationId: message.conversationId, messageId }
  );
  revalidatePath(`/messages/${message.conversationId}`);
}

export async function hideMessage(messageId: string) {
  const user = await requireUser();
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error('消息不存在');
  await requireConversationMember(message.conversationId, user.id);

  await db.hiddenMessage.upsert({
    where: { messageId_userId: { messageId, userId: user.id } },
    update: {},
    create: { messageId, userId: user.id },
  });
  revalidatePath(`/messages/${message.conversationId}`);
}

export async function hideConversation(conversationId: string) {
  const user = await requireUser();
  await requireConversationMember(conversationId, user.id);
  await db.conversationMember.update({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
    data: { hiddenAt: new Date() },
  });
  revalidatePath('/messages');
}

export async function toggleBlockUser(targetUserId: string) {
  const user = await requireUser();
  if (user.id === targetUserId) throw new Error('不能屏蔽自己');

  const existing = await db.userBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId: user.id, blockedId: targetUserId },
    },
  });

  if (existing) {
    await db.userBlock.delete({ where: { id: existing.id } });
  } else {
    await db.userBlock.create({
      data: { blockerId: user.id, blockedId: targetUserId },
    });
  }

  revalidatePath('/messages');
  return { blocked: !existing };
}

export async function reportMessage(messageId: string, reason: string) {
  const user = await requireUser();
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) {
    throw new Error('举报原因需为 3 到 500 个字符');
  }

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) throw new Error('消息不存在');
  await requireConversationMember(message.conversationId, user.id);

  await db.messageReport.upsert({
    where: { messageId_reporterId: { messageId, reporterId: user.id } },
    update: { reason: cleanReason, status: 'OPEN', resolvedAt: null },
    create: { messageId, reporterId: user.id, reason: cleanReason },
  });
}

export async function resolveMessageReport(
  reportId: string,
  status: 'RESOLVED' | 'DISMISSED',
  note: string
) {
  await requireAdmin();
  await db.messageReport.update({
    where: { id: reportId },
    data: {
      status,
      note: note.trim().slice(0, 1000),
      resolvedAt: new Date(),
    },
  });
  revalidatePath('/admin/messages');
}

export async function warnMessageSender(messageId: string, warning: string) {
  const admin = await requireAdmin();
  const message = await db.message.findUnique({
    where: { id: messageId },
    select: { senderId: true },
  });
  if (!message) throw new Error('消息不存在');

  await db.userNotification.create({
    data: {
      type: 'admin_warning',
      message: `管理员提醒：${warning.trim().slice(0, 500)}`,
      userId: message.senderId,
      fromUserId: admin.id,
    },
  });
}

export async function updateMessagingPreference(preference: string) {
  const user = await requireUser();
  if (!['EVERYONE', 'INTERACTIONS', 'NONE'].includes(preference)) {
    throw new Error('私信权限设置无效');
  }
  await db.user.update({
    where: { id: user.id },
    data: { messagingPreference: preference },
  });
  revalidatePath('/profile');
}
