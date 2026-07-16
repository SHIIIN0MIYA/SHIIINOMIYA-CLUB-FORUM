// src/app/profile/page.tsx
import { auth } from '../../auth';
import { db } from '../../lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import EditNameForm from './EditNameForm';
import ChangePasswordForm from './ChangePasswordForm';
import MessagePrivacyForm from './MessagePrivacyForm';
import ProfileMediaForm from './ProfileMediaForm';
import Image from 'next/image';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          _count: { select: { likes: true, comments: true } },
        },
      },
      _count: {
        select: { posts: true, comments: true, likes: true },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="relative z-10 min-h-screen px-6 pt-24 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* 用户信息卡片 */}
        <div className="relative overflow-hidden bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-6 mb-8">
          {user.backgroundImage && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${user.backgroundImage}")` }}
              />
              <div className="absolute inset-0 bg-black/65" />
            </>
          )}
          <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || '用户头像'}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-full border-2 border-white/20 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center text-2xl font-bold text-black">
                {(user.name || '用')[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{user.name || '未设置用户名'}</h1>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>

          {/* 统计数据 */}
          <div className="flex gap-6 text-sm text-gray-400 mb-4">
            <span>📝 {user._count.posts} 帖子</span>
            <span>💬 {user._count.comments} 评论</span>
            <span>❤️ {user._count.likes} 点赞</span>
          </div>

          <p className="text-xs text-gray-500">
            注册时间：{new Date(user.createdAt).toLocaleDateString()} · 角色：{user.role === 'admin' ? '管理员' : '普通用户'}
          </p>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">头像与主页背景</h2>
          <ProfileMediaForm
            initialImage={user.image}
            initialBackgroundImage={user.backgroundImage}
            displayName={user.name || '用户'}
          />
        </div>

        {/* 修改用户名 */}
        <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">修改用户名</h2>
          <EditNameForm currentName={user.name || ''} />
        </div>

        {/* 修改密码 */}
        <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">修改密码</h2>
          <ChangePasswordForm />
        </div>

        <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">私信权限</h2>
          <p className="mb-4 text-xs leading-5 text-gray-500">
            管理员可以查看站内私信用于社区安全管理，请勿发送敏感个人信息。
          </p>
          <MessagePrivacyForm initialValue={user.messagingPreference} />
        </div>

        {/* 我的帖子 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">我的帖子</h2>
          {user.posts.length === 0 ? (
            <p className="text-gray-500">还没有发表过帖子。</p>
          ) : (
            <div className="space-y-3">
              {user.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block bg-[var(--surface)] border border-[var(--card-border)] rounded-lg p-4 hover:border-white/15 transition-colors no-underline"
                >
                  <h3 className="text-white font-medium mb-1">{post.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>❤️ {post._count.likes}</span>
                    <span>💬 {post._count.comments}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
