'use client';

import { useState } from 'react';
import { deleteComment } from '../../actions';

interface DeleteCommentButtonProps {
  commentId: string;
}

export default function DeleteCommentButton({ commentId }: DeleteCommentButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteComment(commentId);
    } catch (e: any) {
      alert(e.message || '删除失败');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
      title="删除评论"
    >
      {loading ? '...' : '🗑️ 删除'}
    </button>
  );
}