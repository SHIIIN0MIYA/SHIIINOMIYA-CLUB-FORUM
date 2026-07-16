'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deletePost, togglePin } from '../../actions';

interface PostActionsProps {
  postId: string;
  isAuthor: boolean;
  isAdmin: boolean;
  pinned: boolean;
}

export default function PostActions({ postId, isAuthor, isAdmin, pinned }: PostActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;
  const canPin = isAdmin;

  async function handleDelete() {
    if (!confirm('确定要删除这篇帖子吗？此操作不可撤销。')) return;
    setDeleting(true);
    try {
      await deletePost(postId);
      router.push('/posts');
      router.refresh();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : '删除失败');
      setDeleting(false);
    }
  }

  async function handlePin() {
    setPinLoading(true);
    try {
      await togglePin(postId);
      router.refresh();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setPinLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {canEdit && (
        <button
          onClick={() => router.push(`/posts/${postId}/edit`)}
          className="px-4 py-2 text-sm rounded-lg border border-white/20 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          ✏️ 编辑
        </button>
      )}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-sm rounded-lg border border-white/20 bg-white/5 text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {deleting ? '删除中...' : '🗑️ 删除'}
        </button>
      )}
      {canPin && (
        <button
          onClick={handlePin}
          disabled={pinLoading}
          className="px-4 py-2 text-sm rounded-lg border border-white/20 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {pinLoading ? '处理中...' : pinned ? '📌 取消置顶' : '📌 置顶'}
        </button>
      )}
    </div>
  );
}
