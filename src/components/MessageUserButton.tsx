'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { startConversation } from '../app/messages/actions';

export default function MessageUserButton({
  userId,
  postId,
  compact = false,
}: {
  userId: string;
  postId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function openConversation() {
    setLoading(true);
    try {
      const result = await startConversation(userId, postId);
      router.push(`/messages/${result.conversationId}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '无法发起私信');
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openConversation}
      disabled={loading}
      className={`rounded-lg border border-white/10 bg-white/[0.04] text-gray-300 transition hover:border-[var(--accent)]/30 hover:text-white disabled:opacity-50 ${
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
      }`}
    >
      {loading ? '打开中...' : postId ? '分享并私信' : '私信'}
    </button>
  );
}
