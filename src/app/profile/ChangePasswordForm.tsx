'use client';

import { useState } from 'react';
import { changePassword } from '../actions';

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.set('oldPassword', oldPassword);
    formData.set('newPassword', newPassword);
    formData.set('confirmPassword', confirmPassword);

    try {
      await changePassword(formData);
      setMessage('密码修改成功！');
    } catch (err: any) {
      setError(err.message || '修改失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">旧密码</label>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          placeholder="输入当前密码"
          required
          className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">新密码（至少6位）</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="输入新密码"
          required
          minLength={6}
          className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">确认新密码</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="再次输入新密码"
          required
          className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
        />
      </div>
      {message && <p className="text-green-400 text-sm">{message}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 bg-[var(--accent)] text-black rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 self-start"
      >
        {loading ? '修改中...' : '修改密码'}
      </button>
    </form>
  );
}