import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '../../../auth';
import MessageUserButton from '../../../components/MessageUserButton';
import { db } from '../../../lib/db';

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  const session = await auth();
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      backgroundImage: true,
      role: true,
      createdAt: true,
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          createdAt: true,
          _count: { select: { likes: true, comments: true } },
        },
      },
      _count: { select: { posts: true, comments: true } },
    },
  });

  if (!user || user.role === 'banned') notFound();
  const displayName = user.name || '匿名用户';

  return (
    <div className="relative z-10 min-h-screen px-6 pb-16 pt-24">
      <div className="mx-auto max-w-3xl">
        <section className="relative mb-8 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)]">
          <div
            className="h-48 bg-gradient-to-br from-white/10 to-transparent bg-cover bg-center"
            style={
              user.backgroundImage
                ? { backgroundImage: `url("${user.backgroundImage}")` }
                : undefined
            }
          />
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="relative -mt-12 flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
            <div className="flex items-end gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={displayName}
                  width={96}
                  height={96}
                  unoptimized
                  className="h-24 w-24 rounded-full border-4 border-[var(--surface)] object-cover"
                />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--surface)] bg-[var(--accent)] text-3xl font-bold text-black">
                  {displayName[0]}
                </span>
              )}
              <div className="pb-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <p className="text-sm text-gray-400">
                  {user._count.posts} 篇帖子 · {user._count.comments} 条评论
                </p>
              </div>
            </div>
            {session?.user?.id && session.user.id !== user.id && (
              <MessageUserButton userId={user.id} />
            )}
          </div>
          <p className="px-6 pb-6 text-xs text-gray-500">
            加入于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </section>

        <h2 className="mb-4 text-xl font-semibold">最近发布</h2>
        {user.posts.length === 0 ? (
          <p className="text-gray-500">还没有发布过帖子。</p>
        ) : (
          <div className="space-y-3">
            {user.posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-4 hover:border-white/20"
              >
                <h3 className="font-medium text-white">{post.title}</h3>
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString('zh-CN')} · ♥ {post._count.likes} · 💬 {post._count.comments}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
