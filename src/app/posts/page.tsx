// src/app/posts/page.tsx
import Link from 'next/link';
import { db } from '../../lib/db';

const PAGE_SIZE = 6;

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || '1'));

  const totalPosts = await db.post.count();
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);

  const posts = await db.post.findMany({
    orderBy: [
      { pinned: 'desc' },
      { createdAt: 'desc' },
    ],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      author: { select: { name: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return (
    <div className="relative z-10 min-h-screen px-6 pt-24 pb-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-widest text-center mb-2">
          帖子广场
        </h1>
        <p className="text-center text-[var(--text-secondary)] mb-10">
          浏览最新讨论，发现有趣话题
        </p>

        {posts.length === 0 ? (
          <p className="text-center text-gray-500">暂无帖子，快来发表第一篇吧。</p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-6 transition-all duration-300 hover:bg-[var(--surface-hover)] hover:border-white/15 hover:-translate-y-1 hover:shadow-2xl cursor-pointer no-underline group"
                >
                  <h2 className="text-lg font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">
                    {post.pinned && <span className="mr-1" title="置顶">📌</span>}
                    {post.title}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                    {post.content}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.tags.split(',').map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs rounded-full bg-white/5 text-gray-300 border border-white/10"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                    <span>{post.author.name || '匿名'} · {
                      new Date(post.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })
                    }</span>
                    <div className="flex items-center gap-3">
                      <span>❤️ {post._count.likes}</span>
                      <span>💬 {post._count.comments}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页导航 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                {page > 1 && (
                  <Link
                    href={`/posts?page=${page - 1}`}
                    className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    ← 上一页
                  </Link>
                )}
                <span className="text-gray-400 text-sm">
                  第 {page} / {totalPages} 页
                </span>
                {page < totalPages && (
                  <Link
                    href={`/posts?page=${page + 1}`}
                    className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    下一页 →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}