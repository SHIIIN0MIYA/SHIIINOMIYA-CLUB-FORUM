'use client';

import { useState } from 'react';
import { updateProfile } from '../actions';

interface Props {
  currentName: string;
}

export default function EditNameForm({ currentName }: Props) {
  const [name, setName] = useState(currentName);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.set('name', name);

    try {
      await updateProfile(formData);
      setMessage('用户名修改成功！');
    } catch (err: any) {
      setError(err.message || '修改失败');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="输入新用户名"
          className="flex-1 bg-transparent border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-[var(--accent)] text-black rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          保存
        </button>
      </div>
      {message && <p className="text-green-400 text-sm">{message}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}