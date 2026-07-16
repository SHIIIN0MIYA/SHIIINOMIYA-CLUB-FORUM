import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { db } from '../../../lib/db';
import UserBanButton from './UserBanButton';

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== 'admin') {
    redirect('/posts');
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          comments: true,
          likes: true,
        },
      },
    },
  });

  const bannedCount = users.filter((user) => user.role === 'banned').length;

  return (
    <div className="relative z-10 min-h-screen px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
              Admin console
            </p>
            <h1 className="text-3xl font-bold tracking-wide">注册用户管理</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              查看当前注册人员，并管理账号访问状态。
            </p>
          </div>
          <div className="flex gap-2 text-xs text-gray-300">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              共 {users.length} 人
            </span>
            <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-red-300">
              已封禁 {bannedCount} 人
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl">
          {users.length === 0 ? (
            <p className="p-8 text-center text-gray-400">当前没有注册用户。</p>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {users.map((user) => {
                const isCurrentAdmin = user.id === session.user.id;
                const displayName = user.name || '未设置用户名';

                return (
                  <div
                    key={user.id}
                    className="grid gap-4 p-4 transition hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold text-white">
                          {displayName}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            user.role === 'admin'
                              ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                              : user.role === 'banned'
                                ? 'bg-red-400/10 text-red-300'
                                : 'bg-white/[0.07] text-gray-300'
                          }`}
                        >
                          {user.role === 'admin'
                            ? '管理员'
                            : user.role === 'banned'
                              ? '已封禁'
                              : '普通用户'}
                        </span>
                        {isCurrentAdmin && (
                          <span className="text-[10px] text-gray-500">当前账号</span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-400">
                        {user.email || '未设置邮箱'}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        注册于{' '}
                        {new Intl.DateTimeFormat('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        }).format(user.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-400 sm:justify-center">
                      <span>帖子 {user._count.posts}</span>
                      <span>评论 {user._count.comments}</span>
                      <span>点赞 {user._count.likes}</span>
                    </div>

                    <div className="flex justify-end">
                      {user.role === 'admin' ? (
                        <span className="px-3 py-2 text-xs text-gray-500">
                          不可封禁
                        </span>
                      ) : (
                        <UserBanButton
                          userId={user.id}
                          userName={displayName}
                          currentRole={user.role}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
