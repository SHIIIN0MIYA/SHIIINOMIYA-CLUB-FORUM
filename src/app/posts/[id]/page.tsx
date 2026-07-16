// src/app/posts/[id]/page.tsx
import Link from 'next/link';
import { db } from '../../../lib/db';
import { notFound } from 'next/navigation';
import CommentForm from './CommentForm';
import LikeButton from './LikeButton';
import PostActions from './PostActions';
import BanUserButton from './BanUserButton';
import { auth } from '../../../auth';
import ReactMarkdown from 'react-markdown';
import MessageUserButton from '../../../components/MessageUserButton';
import CommentThread from './CommentThread';
import Image from 'next/image';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, image: true, role: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { name: true, image: true } },
          likes: {
            where: { userId: session?.user?.id || '__anonymous__' },
            select: { id: true },
          },
          _count: { select: { likes: true } },
        },
      },
      _count: { select: { likes: true } },
    },
  });

  if (!post) {
    notFound();
  }

  // 检查当前用户是否已点赞
  let liked = false;
  if (session?.user?.id) {
    const existing = await db.like.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: id,
        },
      },
    });
    liked = !!existing;
  }

  const isAuthor = session?.user?.id === post.authorId;
  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="relative z-10 min-h-screen px-6 pt-24 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* 返回按钮 */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          ← 返回帖子广场
        </Link>

        {/* 帖子标题 */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-widest mb-4">
          {post.pinned && <span className="mr-2" title="置顶帖子">📌</span>}
          {post.title}
        </h1>

        {/* 作者与时间 */}
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
          <Link
            href={`/users/${post.authorId}`}
            className="flex items-center gap-2 hover:text-white"
          >
            {post.author.image ? (
              <Image
                src={post.author.image}
                alt={post.author.name || '作者头像'}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-black">
                {(post.author.name || '匿')[0]}
              </span>
            )}
            <span>{post.author.name || '匿名'}</span>
          </Link>
          {session?.user?.id && !isAuthor && post.author.role !== 'banned' && (
            <MessageUserButton userId={post.authorId} postId={post.id} compact />
          )}
          {isAdmin && !isAuthor && (
            <BanUserButton userId={post.authorId} currentRole={post.author.role} />
          )}
          <span>·</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          <span>·</span>
          <LikeButton postId={post.id} initialLikes={post._count.likes} initialLiked={liked} />
        </div>

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.split(',').map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs rounded-full bg-white/5 text-gray-300 border border-white/10"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        {/* 帖子正文 */}
        <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-6 mb-8">
          <div className="text-[var(--text-secondary)] leading-relaxed prose prose-invert max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </div>

        {/* 操作按钮（编辑/删除/置顶） */}
        {session?.user && (
          <PostActions
            postId={post.id}
            isAuthor={isAuthor}
            isAdmin={isAdmin}
            pinned={post.pinned}
          />
        )}

        {/* 评论区 */}
        <section className="border-t border-white/10 pt-6">
          <h2 className="text-xl font-semibold mb-4">
            评论 ({post.comments.length})
          </h2>

          {post.comments.length === 0 ? (
            <p className="text-gray-500">暂无评论，来发表第一条吧。</p>
          ) : (
            <CommentThread
              comments={post.comments.map((comment) => ({
                id: comment.id,
                content: comment.content,
                authorId: comment.authorId,
                parentId: comment.parentId,
                createdAt: comment.createdAt.toISOString(),
                author: comment.author,
                likeCount: comment._count.likes,
                liked: comment.likes.length > 0,
              }))}
              postId={post.id}
              postAuthorId={post.authorId}
              currentUserId={session?.user?.id || null}
              isAdmin={isAdmin}
            />
          )}

          <CommentForm postId={post.id} />
        </section>
      </div>
    </div>
  );
}
