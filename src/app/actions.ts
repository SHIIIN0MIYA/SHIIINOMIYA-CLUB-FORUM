'use server';

import { auth } from '../auth';
import { db } from '../lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcryptjs from 'bcryptjs';

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('请先登录');
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const tags = formData.get('tags') as string || '';

  if (!title || !content) {
    throw new Error('标题和内容不能为空');
  }

  await db.post.create({
    data: {
      title,
      content,
      tags,
      authorId: session.user.id,
    },
  });

  revalidatePath('/posts');
  redirect('/posts');
}

export async function createComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('请先登录');
  const content = formData.get('content') as string;
  const postId = formData.get('postId') as string;
  if (!content || !postId) throw new Error('评论内容不能为空');
  
  await db.comment.create({
    data: { content, postId, authorId: session.user.id },
  });
  
  // 通知帖子作者
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true, title: true } });
  if (post && session.user.id !== post.authorId) {
    await db.userNotification.create({
      data: {
        type: 'comment',
        message: `${session.user.name || '用户'} 评论了你的帖子「${post.title}」`,
        userId: post.authorId,
        postId,
        fromUserId: session.user.id,
      },
    });
  }
  
  // 检测 @ 提及
  const mentions = content.match(/@(\S+)/g);
  if (mentions && post) {
    for (const mention of mentions) {
      const name = mention.slice(1);
      const mentionedUser = await db.user.findFirst({ where: { name } });
      if (mentionedUser && mentionedUser.id !== session.user.id && mentionedUser.id !== post.authorId) {
        await db.userNotification.create({
          data: {
            type: 'mention',
            message: `${session.user.name || '用户'} 在帖子「${post.title}」中提到了你`,
            userId: mentionedUser.id,
            postId,
            fromUserId: session.user.id,
          },
        });
      }
    }
  }
  
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
}

export async function toggleLike(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('请先登录');
  const userId = session.user.id;
  
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
          message: `${session.user.name || '用户'} 赞了你的帖子`,
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
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    throw new Error('请填写所有字段');
  }

  // 检查邮箱是否已被注册
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('该邮箱已被注册');
  }

  const passwordHash = await bcryptjs.hash(password, 10);

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  redirect('/login?registered=true');
}

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('请先登录');
  }

  const name = formData.get('name') as string;

  if (!name || name.trim().length === 0) {
    throw new Error('用户名不能为空');
  }

  if (name.trim().length > 20) {
    throw new Error('用户名不能超过20个字符');
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  });

  revalidatePath('/profile');
}

// 编辑帖子（仅作者本人或管理员可以调用，但服务端还需校验权限）
export async function editPost(postId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('请先登录');

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('帖子不存在');

  // 权限：只有作者本人或管理员可以编辑
  if (post.authorId !== session.user.id && session.user.role !== 'admin') {
    throw new Error('无权限编辑');
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const tags = (formData.get('tags') as string) || '';

  if (!title || !content) throw new Error('标题和内容不能为空');

  await db.post.update({
    where: { id: postId },
    data: { title, content, tags },
  });

  revalidatePath(`/posts/${postId}`);
  revalidatePath('/posts');
}

// 删除帖子（作者本人或管理员）
export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('请先登录');

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('帖子不存在');

  if (post.authorId !== session.user.id && session.user.role !== 'admin') {
    throw new Error('无权限删除');
  }

  await db.post.delete({ where: { id: postId } });

  revalidatePath('/posts');
  redirect('/posts');
}

// 置顶/取消置顶（仅管理员）
export async function togglePin(postId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    throw new Error('仅管理员可执行');
  }

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
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    throw new Error('仅管理员可执行');
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('用户不存在');

  // 简单封禁：将角色改为 banned，解封则改为 user
  const newRole = user.role === 'banned' ? 'user' : 'banned';

  await db.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  revalidatePath(`/profile`); // 如果是在用户主页操作
}

// 修改密码
export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('请先登录');

  const oldPassword = formData.get('oldPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new Error('请填写所有字段');
  }

  if (newPassword.length < 6) {
    throw new Error('新密码至少6个字符');
  }

  if (newPassword !== confirmPassword) {
    throw new Error('两次输入的新密码不一致');
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.passwordHash) {
    throw new Error('用户不存在');
  }

  const isValid = await bcryptjs.compare(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('旧密码错误');
  }

  const newHash = await bcryptjs.hash(newPassword, 10);

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });
}

// 删除评论（作者本人或管理员）
export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('请先登录');

  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error('评论不存在');

  // 权限：评论作者、帖子作者、管理员
  const post = await db.post.findUnique({ where: { id: comment.postId } });
  if (!post) throw new Error('关联帖子不存在');

  const isCommentAuthor = comment.authorId === session.user.id;
  const isPostAuthor = post.authorId === session.user.id;
  const isAdmin = session.user.role === 'admin';

  if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
    throw new Error('无权限删除此评论');
  }

  await db.comment.delete({ where: { id: commentId } });

  revalidatePath(`/posts/${comment.postId}`);
}