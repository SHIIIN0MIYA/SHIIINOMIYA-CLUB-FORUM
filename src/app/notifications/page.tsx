// src/app/notifications/page.tsx
import { auth } from '../../auth';
import { db } from '../../lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const notifications = await db.userNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // 标记所有为已读
  await db.userNotification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative z-10 min-h-screen px-6 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">通知</h1>
        <p className="text-gray-400 text-sm mb-6">
          {unreadCount > 0 ? `${unreadCount} 条新通知` : '所有通知已读'}
        </p>

        {notifications.length === 0 ? (
          <p className="text-gray-500">暂无通知</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.postId ? `/posts/${n.postId}` : '#'}
                className={`block p-4 rounded-lg border transition-colors hover:bg-white/5 ${
                  n.read ? 'bg-transparent border-white/5' : 'bg-[var(--surface)] border-[var(--accent)]/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {n.type === 'like' && <span>❤️</span>}
                  {n.type === 'comment' && <span>💬</span>}
                  {n.type === 'mention' && <span>📢</span>}
                  <span className="text-white">{n.message}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleString('zh-CN')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}