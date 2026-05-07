'use client';

import { useState } from 'react';
import { toggleBanUser } from '../../actions';

interface BanUserButtonProps {
  userId: string;
  currentRole: string;
}

export default function BanUserButton({ userId, currentRole }: BanUserButtonProps) {
  const [loading, setLoading] = useState(false);
  const isBanned = currentRole === 'banned';

  async function handleClick() {
    setLoading(true);
    try {
      await toggleBanUser(userId);
      // 刷新页面以更新角色显示
      window.location.reload();
    } catch (e: any) {
      alert(e.message || '操作失败');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`ml-2 px-2 py-0.5 text-xs rounded border ${
        isBanned ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'
      } hover:bg-white/5 disabled:opacity-50`}
      title={isBanned ? '解封用户' : '封禁用户'}
    >
      {loading ? '...' : isBanned ? '解封' : '封禁'}
    </button>
  );
}