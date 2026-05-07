'use client';

import { useRef, useState } from 'react';
import { createComment } from '../../actions';

export default function CommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError('');
    setPending(true);
        try {
      await createComment(formData);
      formRef.current?.reset();
      window.location.reload(); // 强制刷新
    } catch (e: any) {
      setError(e.message || '评论失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg p-4">
      <input type="hidden" name="postId" value={postId} />
      <textarea
        name="content"
        placeholder="写下你的评论... 输入 @用户名 提及他人"
        required
        rows={3}
        className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 px-5 py-2 rounded-full bg-[var(--accent)] text-black font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? '发表中...' : '发表评论'}
      </button>
    </form>
  );
}