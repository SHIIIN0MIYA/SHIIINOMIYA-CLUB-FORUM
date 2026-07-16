'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { startConversation } from './actions';
import type { ConversationSummary } from './types';

interface SearchUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

function messagePreview(conversation: ConversationSummary) {
  const message = conversation.lastMessage;
  if (!message) return '开始一段新对话';
  if (message.revokedAt) return '消息已撤回';
  if (message.type === 'IMAGE') return message.content || '[图片]';
  if (message.type === 'POST') return message.content || '[帖子分享]';
  return message.content;
}

export default function ConversationList({
  conversations,
  selectedId,
}: {
  conversations: ConversationSummary[];
  selectedId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingId, setStartingId] = useState('');

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/messages/search?q=${encodeURIComponent(cleanQuery)}`,
          { signal: controller.signal }
        );
        const data = await response.json();
        setResults(response.ok ? data.users : []);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function begin(userId: string) {
    setStartingId(userId);
    try {
      const result = await startConversation(userId);
      router.push(`/messages/${result.conversationId}`);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '无法发起会话');
    } finally {
      setStartingId('');
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-white/[0.08] bg-black/20">
      <div className="border-b border-white/[0.08] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">私信</h1>
          <span className="text-xs text-gray-500">{conversations.length} 个会话</span>
        </div>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value.trim()) setResults([]);
          }}
          placeholder="搜索用户名发起私信"
          className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-[var(--accent)]/50"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.trim() ? (
          <div className="p-2">
            <p className="px-2 py-2 text-xs uppercase tracking-wider text-gray-500">
              {searching ? '搜索中...' : '用户搜索结果'}
            </p>
            {results.length === 0 && !searching ? (
              <p className="px-2 py-6 text-center text-sm text-gray-500">
                没有找到匹配用户
              </p>
            ) : (
              results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => begin(user.id)}
                  disabled={startingId === user.id}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <span className="font-medium">{user.name || '未设置用户名'}</span>
                  <span className="text-xs text-[var(--accent)]">
                    {startingId === user.id ? '正在打开...' : '发私信'}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-gray-400">还没有私信</p>
            <p className="mt-2 text-xs text-gray-600">搜索用户名开始聊天</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className={`block border-b border-white/[0.06] px-4 py-4 transition ${
                selectedId === conversation.id
                  ? 'bg-white/[0.08]'
                  : 'hover:bg-white/[0.045]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-medium">
                      {conversation.other.name || '未设置用户名'}
                    </h2>
                    {conversation.other.role === 'banned' && (
                      <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-[10px] text-red-300">
                        已封禁
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {messagePreview(conversation)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <time className="text-[10px] text-gray-600">
                    {new Date(conversation.updatedAt).toLocaleDateString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </time>
                  {conversation.unreadCount > 0 && (
                    <span className="min-w-5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-center text-[10px] font-bold text-black">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
