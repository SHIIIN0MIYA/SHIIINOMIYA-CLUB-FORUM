import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { db } from '../../../lib/db';
import AdminReportActions from './AdminReportActions';

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const admin = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== 'admin') redirect('/posts');

  const { q = '' } = await searchParams;
  const query = q.trim();

  const [reports, conversations] = await Promise.all([
    db.messageReport.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        reporter: { select: { name: true } },
        message: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
      },
    }),
    db.conversation.findMany({
      where: query
        ? {
            OR: [
              {
                members: {
                  some: {
                    user: {
                      name: { contains: query, mode: 'insensitive' },
                    },
                  },
                },
              },
              {
                messages: {
                  some: {
                    content: { contains: query, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            type: true,
            createdAt: true,
            revokedAt: true,
          },
        },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  return (
    <div className="relative z-10 min-h-screen px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
            Admin console
          </p>
          <h1 className="mt-2 text-3xl font-bold">私信管理</h1>
          <p className="mt-2 text-sm text-gray-400">
            管理员可以查看全部站内私信，用于社区安全与举报处理。此权限已向用户公开说明。
          </p>
        </div>

        <form className="mb-8 flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="搜索用户名或消息内容"
            className="flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]/40"
          />
          <button className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black">
            搜索
          </button>
        </form>

        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">待处理举报</h2>
            <span className="text-xs text-gray-500">{reports.length} 条</span>
          </div>
          {reports.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-6 text-sm text-gray-500">
              当前没有待处理举报。
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-red-400/15 bg-black/25 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div>
                      <p className="text-xs text-red-300">
                        {report.reporter.name || '用户'} 举报了{' '}
                        {report.message.sender.name || '用户'} 的消息
                      </p>
                      <p className="mt-2 text-sm text-gray-200">
                        {report.message.revokedAt
                          ? '消息已撤回'
                          : report.message.content || `[${report.message.type}]`}
                      </p>
                      <p className="mt-3 text-xs text-gray-400">
                        原因：{report.reason}
                      </p>
                    </div>
                    <AdminReportActions
                      reportId={report.id}
                      messageId={report.messageId}
                      senderId={report.message.sender.id}
                      senderRole={report.message.sender.role}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">全部会话</h2>
            <span className="text-xs text-gray-500">{conversations.length} 个</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/25">
            {conversations.map((conversation) => {
              const names = conversation.members
                .map((member) => member.user.name || '未命名用户')
                .join(' ↔ ');
              const latest = conversation.messages[0];
              return (
                <Link
                  key={conversation.id}
                  href={`/admin/messages/${conversation.id}`}
                  className="block border-b border-white/[0.07] p-4 transition last:border-0 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium">{names}</h3>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {latest
                          ? latest.revokedAt
                            ? '消息已撤回'
                            : latest.content || `[${latest.type}]`
                          : '暂无消息'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {conversation._count.messages} 条
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
