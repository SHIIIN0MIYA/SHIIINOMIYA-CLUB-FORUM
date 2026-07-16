'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createComment } from '../../actions';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  replyingTo?: string;
  compact?: boolean;
  onCancel?: () => void;
  onSubmitted?: () => void;
}

export default function CommentForm({
  postId,
  parentId,
  replyingTo,
  compact = false,
  onCancel,
  onSubmitted,
}: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError('');
    setPending(true);
    try {
      await createComment(formData);
      formRef.current?.reset();
      onSubmitted?.();
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '评论失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className={
        compact
          ? 'mt-3 rounded-lg border border-white/10 bg-black/15 p-3'
          : 'bg-[var(--surface)] border border-[var(--card-border)] rounded-lg p-4'
      }
    >
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="content"
        placeholder={
          replyingTo
            ? `回复 @${replyingTo}，输入 @用户名 可提及其他人`
            : '写下你的评论... 输入 @用户名 提及他人'
        }
        required
        rows={compact ? 2 : 3}
        maxLength={5000}
        className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-full bg-[var(--accent)] text-black font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? '发表中...' : replyingTo ? '发送回复' : '发表评论'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}
