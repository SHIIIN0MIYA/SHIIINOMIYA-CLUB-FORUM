'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toggleBanUser } from '../../actions';

interface UserBanButtonProps {
  userId: string;
  userName: string;
  currentRole: string;
}

export default function UserBanButton({
  userId,
  userName,
  currentRole,
}: UserBanButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isBanned = currentRole === 'banned';

  async function handleClick() {
    const action = isBanned ? '解封' : '封禁';
    if (!window.confirm(`确定要${action}用户“${userName}”吗？`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await toggleBanUser(userId);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : `${action}失败`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`min-w-20 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isBanned
            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15'
            : 'border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/15'
        }`}
      >
        {loading ? '处理中...' : isBanned ? '解除封禁' : '封禁用户'}
      </button>
      {error && <p className="max-w-44 text-right text-xs text-red-300">{error}</p>}
    </div>
  );
}
