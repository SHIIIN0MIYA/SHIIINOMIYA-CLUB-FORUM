'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '../actions';
import ImageUploader from '../../components/ImageUploader';

export default function CreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError('');
    try {
      const post = await createPost(formData);
      router.push(`/posts/${post.id}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '发帖失败');
    }
  }

  return (
    <div className="relative z-10 min-h-screen px-6 pt-24 pb-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">发布新帖子</h1>
        <form
          ref={formRef}
          action={handleSubmit}
          className="flex flex-col gap-5"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-1">标题</label>
            <input
              type="text"
              name="title"
              placeholder="帖子标题"
              maxLength={120}
              className="w-full bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">内容</label>
            <textarea
              name="content"
              rows={8}
              placeholder="写下你的内容...（支持 Markdown）"
              maxLength={50000}
              className="w-full bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)] resize-none"
              required
            />
            <div className="mt-2">
              <ImageUploader
                onUpload={(url) => {
                  const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                  if (textarea) {
                    textarea.value += `\n![图片](${url})\n`;
                  }
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">标签（逗号分隔）</label>
            <input
              type="text"
              name="tags"
              placeholder="例如：React,前端,教程"
              maxLength={200}
              className="w-full bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-[var(--accent)] text-black py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            发布帖子
          </button>
        </form>
      </div>
    </div>
  );
}
