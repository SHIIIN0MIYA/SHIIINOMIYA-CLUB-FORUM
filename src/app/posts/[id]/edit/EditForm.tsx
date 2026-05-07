'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { editPost } from '../../../actions';

interface EditFormProps {
  postId: string;
  title: string;
  content: string;
  tags: string;
}

export default function EditForm({ postId, title: initTitle, content: initContent, tags: initTags }: EditFormProps) {
  const [title, setTitle] = useState(initTitle);
  const [content, setContent] = useState(initContent);
  const [tags, setTags] = useState(initTags);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const formData = new FormData();
    formData.set('title', title);
    formData.set('content', content);
    formData.set('tags', tags);

    try {
      await editPost(postId, formData);
      router.push(`/posts/${postId}`);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="block text-sm text-gray-400 mb-1">标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">内容</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="w-full bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)] resize-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">标签（逗号分隔）</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-[var(--accent)] text-black rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存修改'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-white/20 rounded-lg text-gray-300 hover:text-white"
        >
          取消
        </button>
      </div>
    </form>
  );
}