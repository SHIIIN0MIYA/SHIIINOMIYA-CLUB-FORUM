'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { register } from '../actions';
import Link from 'next/link';
import TurnstileWidget from '../../components/TurnstileWidget';

export default function RegisterPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(true);

  const loadChallenge = useCallback(async () => {
    setLoadingChallenge(true);
    setTurnstileToken('');
    try {
      const response = await fetch('/api/security/registration-challenge', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '无法加载安全验证');
      setChallenge(data.challenge);
      setTurnstileSiteKey(data.turnstileSiteKey);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : '无法加载安全验证'
      );
      setChallenge('');
    } finally {
      setLoadingChallenge(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadChallenge(), 0);
    return () => window.clearTimeout(timer);
  }, [loadChallenge]);

  async function handleSubmit(formData: FormData) {
    setError('');
    if (!challenge || loadingChallenge) {
      setError('安全验证尚未就绪，请稍后再试');
      return;
    }
    formData.set('registrationChallenge', challenge);
    formData.set('turnstileToken', turnstileToken);
    try {
      await register(formData);
      setSuccess(true);
      formRef.current?.reset();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '注册失败');
      await loadChallenge();
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
          <p className="rounded-lg border border-amber-300/10 bg-amber-300/[0.04] px-3 py-2 text-xs leading-5 text-amber-100/60">
            注册即表示你知悉：为维护社区安全，管理员可以查看站内私信。请勿通过私信发送密码或其他敏感个人信息。
            <Link href="/privacy" className="ml-1 text-[var(--accent)] hover:underline">
              查看隐私说明
            </Link>
          </p>
          <input
            type="text"
            name="name"
            placeholder="用户名"
            maxLength={20}
            required
            className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
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
            minLength={10}
            maxLength={72}
            required
            className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="确认密码"
            minLength={10}
            maxLength={72}
            required
            className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-[var(--accent)]"
          />
          <p className="text-xs leading-5 text-gray-500">
            密码至少 10 位，并同时包含字母和数字。
          </p>
          {turnstileSiteKey && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onToken={setTurnstileToken}
            />
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={
              loadingChallenge ||
              !challenge ||
              Boolean(turnstileSiteKey && !turnstileToken)
            }
            className="bg-[var(--accent)] text-black py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loadingChallenge ? '正在准备安全验证...' : '注册'}
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
