'use client';

import { useRef, useState } from 'react';
import { register } from '../actions';
import Link from 'next/link';

export default function RegisterPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError('');
    try {
      await register(formData);
      setSuccess(true);
      formRef.current?.reset();
    } catch (e: any) {
      setError(e.message || '注册失败');
    }
  }

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-6">注册</h1>

      {success ? (
        <div className="text-center">
          <p className="text-green-400 mb-4">注册成功！</p>
          <Link
            href="/login"
            className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg"
          >
            前往登录
          </Link>
        </div>
      ) : (
        <form
          ref={formRef}
          action={handleSubmit}
          className="flex flex-col gap-4 w-full max-w-sm"
        >
          <input
            type="text"
            name="name"
            placeholder="用户名"
            required
            className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          />
          <input
            type="email"
            name="email"
            placeholder="邮箱"
            required
            className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          />
          <input
            type="password"
            name="password"
            placeholder="密码"
            required
            className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-[var(--accent)] text-black py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            注册
          </button>
          <p className="text-center text-gray-400 text-sm">
            已有账号？{' '}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              去登录
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}