'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleCommentLike } from '../../actions';
import CommentForm from './CommentForm';
import DeleteCommentButton from './DeleteCommentButton';
import MessageUserButton from '../../../components/MessageUserButton';

export interface CommentItem {
  id: string;
  content: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  author: {
    name: string | null;
    image: string | null;
  };
  likeCount: number;
  liked: boolean;
}

interface CommentThreadProps {
  comments: CommentItem[];
  postId: string;
  postAuthorId: string;
  currentUserId: string | null;
  isAdmin: boolean;
}

export default function CommentThread({
  comments,
  postId,
  postAuthorId,
  currentUserId,
  isAdmin,
}: CommentThreadProps) {
  const childrenByParent = useMemo(() => {
    const groups = new Map<string | null, CommentItem[]>();
    for (const comment of comments) {
      const parentExists = comment.parentId
        ? comments.some((candidate) => candidate.id === comment.parentId)
        : false;
      const key = parentExists ? comment.parentId : null;
      groups.set(key, [...(groups.get(key) || []), comment]);
    }
    return groups;
  }, [comments]);

  function renderComments(parentId: string | null, depth = 0): React.ReactNode {
    return (childrenByParent.get(parentId) || []).map((comment) => (
      <CommentCard
        key={comment.id}
        comment={comment}
        depth={depth}
        postId={postId}
        canDelete={
          currentUserId === comment.authorId ||
          currentUserId === postAuthorId ||
          isAdmin
        }
        currentUserId={currentUserId}
      >
        {renderComments(comment.id, depth + 1)}
      </CommentCard>
    ));
  }

  return <div className="space-y-4 mb-6">{renderComments(null)}</div>;
}

function CommentCard({
  comment,
  depth,
  postId,
  canDelete,
  currentUserId,
  children,
}: {
  comment: CommentItem;
  depth: number;
  postId: string;
  canDelete: boolean;
  currentUserId: string | null;
  children: React.ReactNode;
}) {
  const [replying, setReplying] = useState(false);
  const [liked, setLiked] = useState(comment.liked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const displayName = comment.author.name || '匿名用户';

  async function handleLike() {
    if (!currentUserId || pending) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => count + (nextLiked ? 1 : -1));
    setPending(true);
    try {
      const result = await toggleCommentLike(comment.id);
      setLiked(result.liked);
      router.refresh();
    } catch (error) {
      setLiked(!nextLiked);
      setLikeCount((count) => count + (nextLiked ? -1 : 1));
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      id={`comment-${comment.id}`}
      className={`scroll-mt-24 ${depth > 0 ? 'ml-4 border-l border-white/10 pl-4 sm:ml-8' : ''}`}
    >
      <article className="rounded-lg border border-[var(--card-border)] bg-[var(--surface)] p-4">
        <div className="flex items-start gap-3">
          <Link href={`/users/${comment.authorId}`} className="shrink-0">
            {comment.author.image ? (
              <Image
                src={comment.author.image}
                alt={displayName}
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-black">
                {displayName[0]}
              </span>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Link
                  href={`/users/${comment.authorId}`}
                  className="font-medium text-white hover:text-[var(--accent)]"
                >
                  {displayName}
                </Link>
                {currentUserId && currentUserId !== comment.authorId && (
                  <MessageUserButton userId={comment.authorId} compact />
                )}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-wrap break-words text-[var(--text-secondary)]">
              {comment.content}
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={handleLike}
                disabled={!currentUserId || pending}
                className={liked ? 'text-[var(--accent)]' : 'text-gray-400 hover:text-white'}
                title={currentUserId ? '点赞评论' : '登录后点赞'}
              >
                {liked ? '♥' : '♡'} {likeCount}
              </button>
              {currentUserId && (
                <button
                  type="button"
                  onClick={() => setReplying((value) => !value)}
                  className="text-gray-400 hover:text-white"
                >
                  回复
                </button>
              )}
              {canDelete && <DeleteCommentButton commentId={comment.id} />}
            </div>

            {replying && (
              <CommentForm
                postId={postId}
                parentId={comment.id}
                replyingTo={displayName}
                compact
                onCancel={() => setReplying(false)}
                onSubmitted={() => setReplying(false)}
              />
            )}
          </div>
        </div>
      </article>
      {children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
