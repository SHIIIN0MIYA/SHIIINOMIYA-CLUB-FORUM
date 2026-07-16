'use server';

import { db } from '../lib/db';
import { requireAdmin, requireUser } from '../lib/current-user';
import { revalidatePath } from 'next/cache';
import bcryptjs from 'bcryptjs';
import {
  consumeRateLimit,
  getCurrentRequestIp,
  verifyRegistrationChallenge,
  verifyTurnstileToken,
} from '../lib/auth-security';

export async function createPost(formData: FormData) {
  const user = await requireUser();

  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  const tags = String(formData.get('tags') || '').trim();

  if (!title || !content) {
    throw new Error('标题和内容不能为空');
  }
  if (title.length > 120) throw new Error('标题不能超过 120 个字符');
  if (content.length > 50_000) throw new Error('内容不能超过 50000 个字符');
  if (tags.length > 200) throw new Error('标签不能超过 200 个字符');

  const post = await db.post.create({
    data: {
      title,
      content,
      tags,
      authorId: user.id,
    },
  });

  revalidatePath('/posts');
  return { id: post.id };
}

export async function createComment(formData: FormData) {
  const user = await requireUser();
  const content = String(formData.get('content') || '').trim();
  const postId = String(formData.get('postId') || '');
  const parentId = String(formData.get('parentId') || '') || null;
  if (!content || !postId) throw new Error('评论内容不能为空');
  if (content.length > 5_000) throw new Error('评论不能超过 5000 个字符');

  const [post, parent] = await Promise.all([
    db.post.findUnique({
      where: { id: postId },
      select: { authorId: true, title: true },
    }),
    parentId
      ? db.comment.findUnique({
          where: { id: parentId },
          select: { id: true, postId: true, authorId: true, author: { select: { name: true } } },
        })
      : null,
  ]);
  if (!post) throw new Error('帖子不存在');
  if (parentId && (!parent || parent.postId !== postId)) {
    throw new Error('回复的评论不存在');
  }

  const comment = await db.comment.create({
    data: { content, postId, authorId: user.id, parentId },
  });

  const notifications = new Map<
    string,
    { type: string; message: string; userId: string }
  >();

  if (parent && parent.authorId !== user.id) {
    notifications.set(parent.authorId, {
      type: 'reply',
      message: `${user.name || '用户'} 回复了你的评论`,
      userId: parent.authorId,
    });
  } else if (!parent && user.id !== post.authorId) {
    notifications.set(post.authorId, {
      type: 'comment',
      message: `${user.name || '用户'} 评论了你的帖子「${post.title}」`,
      userId: post.authorId,
    });
  }

  const mentionNames = [
    ...new Set(
      Array.from(content.matchAll(/@([\p{L}\p{N}_-]{2,20})/gu), (match) => match[1]),
    ),
  ].slice(0, 10);

  if (mentionNames.length > 0) {
    const mentionedUsers = await db.user.findMany({
      where: { name: { in: mentionNames }, role: { not: 'banned' } },
      select: { id: true },
    });
    for (const mentionedUser of mentionedUsers) {
      if (mentionedUser.id !== user.id && !notifications.has(mentionedUser.id)) {
        notifications.set(mentionedUser.id, {
          type: 'mention',
          message: `${user.name || '用户'} 在帖子「${post.title}」中提到了你`,
          userId: mentionedUser.id,
        });
      }
    }
  }

  if (notifications.size > 0) {
    await db.userNotification.createMany({
      data: Array.from(notifications.values(), (notification) => ({
        ...notification,
        postId,
        commentId: comment.id,
        fromUserId: user.id,
      })),
    });
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath('/notifications');
  return { id: comment.id };
}

export async function toggleCommentLike(commentId: string) {
  const user = await requireUser();
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true, authorId: true },
  });
  if (!comment) throw new Error('评论不存在');

  const existing = await db.commentLike.findUnique({
    where: { userId_commentId: { userId: user.id, commentId } },
  });

  if (existing) {
    await db.commentLike.delete({ where: { id: existing.id } });
  } else {
    await db.commentLike.create({ data: { userId: user.id, commentId } });
    if (comment.authorId !== user.id) {
      await db.userNotification.create({
        data: {
          type: 'comment_like',
          message: `${user.name || '用户'} 赞了你的评论`,
          userId: comment.authorId,
          postId: comment.postId,
          commentId,
          fromUserId: user.id,
        },
      });
    }
  }

  revalidatePath(`/posts/${comment.postId}`);
  revalidatePath('/notifications');
  return { liked: !existing };
}

export async function toggleLike(postId: string) {
  const user = await requireUser();
  const userId = user.id;
  
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw new Error('帖子不存在');
  
  const existing = await db.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  
  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
  } else {
    await db.like.create({ data: { userId, postId } });
    // 通知帖子作者（不要给自己发通知）
    if (userId !== post.authorId) {
      await db.userNotification.create({
        data: {
          type: 'like',
          message: `${user.name || '用户'} 赞了你的帖子`,
          userId: post.authorId,
          postId,
          fromUserId: userId,
        },
      });
    }
  }
  
  revalidatePath(`/posts/${postId}`);
}

export async function register(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');
  const challenge = String(formData.get('registrationChallenge') || '');
  const turnstileToken = String(formData.get('turnstileToken') || '');
  const honeypot = String(formData.get('companyWebsite') || '');
  const ip = await getCurrentRequestIp();

  if (honeypot || !verifyRegistrationChallenge(challenge)) {
    throw new Error('安全验证失败，请刷新页面后重试');
  }

  const challengeUse = await consumeRateLimit({
    scope: 'register-challenge-token',
    identifier: challenge,
    limit: 1,
    windowMs: 20 * 60 * 1000,
  });
  if (!challengeUse.allowed) {
    throw new Error('安全验证已失效，请刷新页面后重试');
  }

  if (!name || !email || !password || !confirmPassword) {
    throw new Error('请填写所有字段');
  }
  if (name.length < 2 || name.length > 20) {
    throw new Error('用户名长度需为 2 到 20 个字符');
  }
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error('用户名包含无效字符');
  }
  if (/^(管理员|admin|administrator|system|官方)$/i.test(name)) {
    throw new Error('该用户名不可使用');
  }
  if (email.length > 254) throw new Error('邮箱长度无效');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('邮箱格式不正确');
  if (password.length < 10) throw new Error('密码至少需要 10 个字符');
  if (password.length > 72) throw new Error('密码不能超过 72 个字符');
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('密码必须同时包含字母和数字');
  }
  if (password !== confirmPassword) throw new Error('两次输入的密码不一致');

  const [ipHourly, ipDaily, emailDaily, turnstileValid] = await Promise.all([
    consumeRateLimit({
      scope: 'register-ip-hour',
      identifier: ip,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    }),
    consumeRateLimit({
      scope: 'register-ip-day',
      identifier: ip,
      limit: 15,
      windowMs: 24 * 60 * 60 * 1000,
    }),
    consumeRateLimit({
      scope: 'register-email-day',
      identifier: email,
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
    }),
    verifyTurnstileToken(turnstileToken, ip),
  ]);

  if (!ipHourly.allowed || !ipDaily.allowed || !emailDaily.allowed) {
    throw new Error('注册请求过于频繁，请稍后再试');
  }
  if (!turnstileValid) {
    throw new Error('人机验证失败，请重试');
  }

  // 检查邮箱是否已被注册
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('该邮箱已被注册');
  }

  const passwordHash = await bcryptjs.hash(password, 12);

  try {
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new Error('该邮箱已被注册');
    }
    throw error;
  }

  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();

  const name = formData.get('name') as string;

  if (!name || name.trim().length === 0) {
    throw new Error('用户名不能为空');
  }

  if (name.trim().length > 20) {
    throw new Error('用户名不能超过20个字符');
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: name.trim() },
  });

  revalidatePath('/profile');
}

function parseProfileImage(value: FormDataEntryValue | null) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (url.length > 2_000) throw new Error('图片地址过长');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('图片地址无效');
  }

  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname.endsWith('.public.blob.vercel-storage.com')
  ) {
    throw new Error('请上传图片后再保存');
  }
  return parsed.toString();
}

export async function updateProfileImages(formData: FormData) {
  const user = await requireUser();
  const image = parseProfileImage(formData.get('image'));
  const backgroundImage = parseProfileImage(formData.get('backgroundImage'));

  await db.user.update({
    where: { id: user.id },
    data: { image, backgroundImage },
  });

  revalidatePath('/profile');
  revalidatePath(`/users/${user.id}`);
}

// 编辑帖子（仅作者本人或管理员可以调用，但服务端还需校验权限）
export async function editPost(postId: string, formData: FormData) {
  const user = await requireUser();

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('帖子不存在');

  // 权限：只有作者本人或管理员可以编辑
  if (post.authorId !== user.id && user.role !== 'admin') {
    throw new Error('无权限编辑');
  }

  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  const tags = String(formData.get('tags') || '').trim();

  if (!title || !content) throw new Error('标题和内容不能为空');
  if (title.length > 120) throw new Error('标题不能超过 120 个字符');
  if (content.length > 50_000) throw new Error('内容不能超过 50000 个字符');
  if (tags.length > 200) throw new Error('标签不能超过 200 个字符');

  await db.post.update({
    where: { id: postId },
    data: { title, content, tags },
  });

  revalidatePath(`/posts/${postId}`);
  revalidatePath('/posts');
}

// 删除帖子（作者本人或管理员）
export async function deletePost(postId: string) {
  const user = await requireUser();

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('帖子不存在');

  if (post.authorId !== user.id && user.role !== 'admin') {
    throw new Error('无权限删除');
  }

  await db.post.delete({ where: { id: postId } });

  revalidatePath('/posts');
  return { success: true };
}

// 置顶/取消置顶（仅管理员）
export async function togglePin(postId: string) {
  await requireAdmin();

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('帖子不存在');

  await db.post.update({
    where: { id: postId },
    data: { pinned: !post.pinned },
  });

  revalidatePath(`/posts/${postId}`);
  revalidatePath('/posts');
}

// 封禁/解封用户（仅管理员，这里通过 role 切换实现简单封禁，也可增加 banned 字段）
export async function toggleBanUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error('不能封禁自己的账号');

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('用户不存在');
  if (user.role === 'admin') throw new Error('不能封禁管理员账号');

  // 简单封禁：将角色改为 banned，解封则改为 user
  const newRole = user.role === 'banned' ? 'user' : 'banned';

  await db.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  revalidatePath(`/profile`); // 如果是在用户主页操作
  revalidatePath('/admin/users');
  revalidatePath('/posts');
}

// 修改密码
export async function changePassword(formData: FormData) {
  const currentUser = await requireUser();

  const oldPassword = formData.get('oldPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new Error('请填写所有字段');
  }

  if (newPassword.length < 8) {
    throw new Error('新密码至少 8 个字符');
  }
  if (newPassword.length > 72) throw new Error('新密码不能超过 72 个字符');

  if (newPassword !== confirmPassword) {
    throw new Error('两次输入的新密码不一致');
  }

  const user = await db.user.findUnique({ where: { id: currentUser.id } });
  if (!user || !user.passwordHash) {
    throw new Error('用户不存在');
  }

  const isValid = await bcryptjs.compare(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('旧密码错误');
  }

  const newHash = await bcryptjs.hash(newPassword, 10);

  await db.user.update({
    where: { id: currentUser.id },
    data: { passwordHash: newHash },
  });
}

// 删除评论（作者本人或管理员）
export async function deleteComment(commentId: string) {
  const user = await requireUser();

  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error('评论不存在');

  // 权限：评论作者、帖子作者、管理员
  const post = await db.post.findUnique({ where: { id: comment.postId } });
  if (!post) throw new Error('关联帖子不存在');

  const isCommentAuthor = comment.authorId === user.id;
  const isPostAuthor = post.authorId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
    throw new Error('无权限删除此评论');
  }

  await db.comment.delete({ where: { id: commentId } });

  revalidatePath(`/posts/${comment.postId}`);
}
