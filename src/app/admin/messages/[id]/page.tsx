import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { db } from '../../../../lib/db';

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const admin = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== 'admin') redirect('/posts');

  const { id } = await params;
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { name: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 500,
        include: {
          sender: { select: { name: true } },
          attachments: true,
          post: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!conversation) notFound();

  return (
    <div className="relative z-10 min-h-screen px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/messages" className="text-sm text-gray-400 hover:text-white">
          ← 返回私信管理
        </Link>
        <h1 className="mt-5 text-2xl font-bold">
          {conversation.members
            .map((member) => member.user.name || '未命名用户')
            .join(' ↔ ')}
        </h1>
        <p className="mt-2 text-xs text-amber-100/50">
          管理员只读视图，不能编辑或删除用户消息。
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/[0.08] bg-black/25 p-4 sm:p-6">
          {conversation.messages.map((message) => (
            <article key={message.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">
                  {message.sender.name || '未命名用户'}
                </span>
                <time className="text-xs text-gray-600">
                  {message.createdAt.toLocaleString('zh-CN')}
                </time>
              </div>
              {message.revokedAt ? (
                <p className="mt-2 text-sm italic text-gray-500">消息已撤回</p>
              ) : (
                <>
                  {message.content && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                      {message.content}
                    </p>
                  )}
                  {message.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                          <Image
                            src={attachment.url}
                            alt="私信附件"
                            width={140}
                            height={100}
                            unoptimized
                            className="h-24 w-32 rounded-lg object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {message.post && (
                    <Link
                      href={`/posts/${message.post.id}`}
                      className="mt-3 inline-block text-xs text-[var(--accent)]"
                    >
                      查看分享的帖子：{message.post.title}
                    </Link>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
