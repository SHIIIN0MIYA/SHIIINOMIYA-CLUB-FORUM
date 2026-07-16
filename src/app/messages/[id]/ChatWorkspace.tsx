'use client';

import * as Ably from 'ably';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import ConversationList from '../ConversationList';
import {
  hideConversation,
  hideMessage,
  markConversationRead,
  reportMessage,
  revokeMessage,
  sendMessage,
  toggleBlockUser,
  type MessageAttachmentInput,
} from '../actions';
import type { ChatMessage, ConversationSummary } from '../types';
import type { SerializedGame, SerializedGameStat } from '../../../lib/game-data';
import ChatGamePanel from './ChatGamePanel';

interface ChatWorkspaceProps {
  currentUserId: string;
  conversationId: string;
  conversations: ConversationSummary[];
  initialMessages: ChatMessage[];
  otherUser: {
    id: string;
    name: string | null;
    role: string;
  };
  blockedByMe: boolean;
  blockedEitherWay: boolean;
  otherLastReadAt: string | null;
  initialGame: SerializedGame | null;
  initialGameStats: SerializedGameStat[];
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  );
}

export default function ChatWorkspace({
  currentUserId,
  conversationId,
  conversations,
  initialMessages,
  otherUser,
  blockedByMe: initialBlockedByMe,
  blockedEitherWay: initialBlockedEitherWay,
  otherLastReadAt,
  initialGame,
  initialGameStats,
}: ChatWorkspaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachments, setAttachments] = useState<MessageAttachmentInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(initialBlockedByMe);
  const [blockedEitherWay, setBlockedEitherWay] = useState(initialBlockedEitherWay);
  const [clock, setClock] = useState(() => Date.now());
  const [gamesOpen, setGamesOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const realtimeChannelRef = useRef<Ably.RealtimeChannel | null>(null);

  const refreshMessages = useCallback(async () => {
    const response = await fetch(`/api/messages/${conversationId}`, {
      cache: 'no-store',
    });
    if (!response.ok) return;
    const data = await response.json();
    setMessages((current) => mergeMessages(current, data.messages));
    await markConversationRead(conversationId).catch(() => undefined);
  }, [conversationId]);

  useEffect(() => {
    void markConversationRead(conversationId);
    const interval = window.setInterval(refreshMessages, 3_000);
    return () => window.clearInterval(interval);
  }, [conversationId, refreshMessages]);

  useEffect(() => {
    let client: Ably.Realtime | null = null;
    let active = true;

    const connect = async () => {
      const preflight = await fetch('/api/ably/token', { cache: 'no-store' });
      if (!preflight.ok || !active) return;

      client = new Ably.Realtime({
        clientId: currentUserId,
        authCallback: async (_params, callback) => {
          try {
            const response = await fetch('/api/ably/token', { cache: 'no-store' });
            if (!response.ok) throw new Error('实时鉴权失败');
            callback(null, await response.json());
          } catch (error) {
            callback(
              error instanceof Error ? error.message : '实时鉴权失败',
              null
            );
          }
        },
      });
      const channel = client.channels.get(`private:conversation:${conversationId}`);
      channel.subscribe('message.created', refreshMessages);
      channel.subscribe('message.revoked', refreshMessages);
      channel.subscribe('conversation.read', () => router.refresh());
      channel.subscribe('game.updated', (message) => {
        const data = message.data as { actorId?: string };
        if (data.actorId === currentUserId) return;
        window.dispatchEvent(new Event('chat-game-updated'));
      });
      channel.subscribe('typing', (message) => {
        const data = message.data as { userId?: string; typing?: boolean };
        if (data.userId !== currentUserId && active) {
          setTyping(Boolean(data.typing));
          if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
          typingTimerRef.current = window.setTimeout(() => setTyping(false), 2_500);
        }
      });
      realtimeChannelRef.current = channel;
    };

    void connect().catch(() => undefined);

    return () => {
      active = false;
      realtimeChannelRef.current = null;
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (client) {
        Promise.resolve(client.close()).catch(() => undefined);
      }
    };
  }, [conversationId, currentUserId, refreshMessages, router]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 10_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typing]);

  async function publishTyping(isTyping: boolean) {
    const realtimeChannel = realtimeChannelRef.current;
    if (!realtimeChannel || blockedEitherWay) return;
    try {
      await realtimeChannel.publish('typing', {
        userId: currentUserId,
        typing: isTyping,
      });
    } catch {
      // Typing state is best-effort only.
    }
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(
      0,
      Math.max(0, 4 - attachments.length)
    );
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded: MessageAttachmentInput[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} 超过 5MB`);
        }
        const formData = new FormData();
        formData.set('file', file);
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '图片上传失败');
        uploaded.push({
          url: data.url,
          mimeType: data.mimeType,
          size: data.size,
        });
      }
      setAttachments((current) => [...current, ...uploaded].slice(0, 4));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending || blockedEitherWay) return;

    setSending(true);
    try {
      await sendMessage({
        conversationId,
        content,
        attachments,
        replyToId: replyTo?.id,
      });
      setContent('');
      setAttachments([]);
      setReplyTo(null);
      await publishTyping(false);
      await refreshMessages();
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSending(false);
    }
  }

  async function handleBlock() {
    const action = blockedByMe ? '解除屏蔽' : '屏蔽';
    if (!window.confirm(`确定要${action}“${otherUser.name || '该用户'}”吗？`)) return;
    try {
      const result = await toggleBlockUser(otherUser.id);
      setBlockedByMe(result.blocked);
      setBlockedEitherWay(result.blocked);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : `${action}失败`);
    }
  }

  async function handleHideConversation() {
    if (!window.confirm('从你的会话列表中隐藏这段对话？收到新消息后会重新出现。')) {
      return;
    }
    await hideConversation(conversationId);
    router.push('/messages');
    router.refresh();
  }

  async function handleMessageAction(
    message: ChatMessage,
    action: 'reply' | 'revoke' | 'hide' | 'report'
  ) {
    try {
      if (action === 'reply') {
        setReplyTo(message);
        return;
      }
      if (action === 'revoke') {
        await revokeMessage(message.id);
      }
      if (action === 'hide') {
        await hideMessage(message.id);
        setMessages((current) => current.filter((item) => item.id !== message.id));
      }
      if (action === 'report') {
        const reason = window.prompt('请填写举报原因（3-500 字）');
        if (!reason) return;
        await reportMessage(message.id, reason);
        window.alert('举报已提交');
      }
      await refreshMessages();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '操作失败');
    }
  }

  return (
    <div className="grid h-full min-h-0 md:grid-cols-[340px_1fr]">
      <div className="hidden min-h-0 md:block">
        <ConversationList
          conversations={conversations}
          selectedId={conversationId}
        />
      </div>

      <section className="flex min-h-0 flex-col bg-[#070a11]/50">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/messages" className="text-gray-400 md:hidden">
              ←
            </Link>
            <div className="min-w-0">
              <h1 className="truncate font-semibold">
                {otherUser.name || '未设置用户名'}
              </h1>
              <p className="text-xs text-gray-500">
                {typing ? '正在输入...' : otherUser.role === 'banned' ? '账号已封禁' : '站内私信'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGamesOpen(true)}
              className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/[0.07] px-2.5 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/[0.12]"
            >
              小游戏
            </button>
            <button
              type="button"
              onClick={handleBlock}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              {blockedByMe ? '解除屏蔽' : '屏蔽'}
            </button>
            <button
              type="button"
              onClick={handleHideConversation}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              隐藏会话
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/55">
              为维护社区安全，管理员可以查看站内私信。请勿发送密码、证件或其他敏感个人信息。
            </div>

            {messages.map((message) => {
              const mine = message.senderId === currentUserId;
              const canRevoke =
                mine &&
                !message.revokedAt &&
                clock - new Date(message.createdAt).getTime() <= 2 * 60 * 1000;
              const read =
                mine &&
                otherLastReadAt &&
                new Date(message.createdAt) <= new Date(otherLastReadAt);

              return (
                <article
                  key={message.id}
                  className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[86%] sm:max-w-[72%] ${mine ? 'text-right' : ''}`}>
                    <div
                      className={`rounded-2xl border px-4 py-3 text-left ${
                        mine
                          ? 'border-[var(--accent)]/20 bg-[rgba(201,169,110,0.12)]'
                          : 'border-white/[0.08] bg-white/[0.055]'
                      }`}
                    >
                      {message.revokedAt ? (
                        <p className="text-sm italic text-gray-500">消息已撤回</p>
                      ) : (
                        <>
                          {message.replyTo && (
                            <div className="mb-2 rounded-lg border-l-2 border-white/20 bg-black/20 px-3 py-2 text-xs text-gray-400">
                              <p className="font-medium text-gray-300">
                                {message.replyTo.sender.name || '用户'}
                              </p>
                              <p className="mt-0.5 line-clamp-2">
                                {message.replyTo.revokedAt
                                  ? '消息已撤回'
                                  : message.replyTo.content || `[${message.replyTo.type}]`}
                              </p>
                            </div>
                          )}

                          {message.attachments.length > 0 && (
                            <div className={`mb-2 grid gap-2 ${message.attachments.length > 1 ? 'grid-cols-2' : ''}`}>
                              {message.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Image
                                    src={attachment.url}
                                    alt="私信图片"
                                    width={420}
                                    height={320}
                                    unoptimized
                                    className="max-h-72 w-full rounded-xl object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          {message.post && (
                            <Link
                              href={`/posts/${message.post.id}`}
                              className="mb-2 block rounded-xl border border-white/10 bg-black/25 p-3 transition hover:border-[var(--accent)]/30"
                            >
                              <p className="text-xs text-[var(--accent)]">分享的帖子</p>
                              <h3 className="mt-1 font-medium">{message.post.title}</h3>
                              <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                                {message.post.content}
                              </p>
                            </Link>
                          )}

                          {message.content && (
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.content}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className={`mt-1 flex items-center gap-2 text-[10px] text-gray-600 ${mine ? 'justify-end' : ''}`}>
                      <time>
                        {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      {mine && <span>{read ? '已读' : '已发送'}</span>}
                      {!message.revokedAt && (
                        <>
                          <button onClick={() => handleMessageAction(message, 'reply')}>
                            回复
                          </button>
                          {canRevoke && (
                            <button onClick={() => handleMessageAction(message, 'revoke')}>
                              撤回
                            </button>
                          )}
                          <button onClick={() => handleMessageAction(message, 'hide')}>
                            隐藏
                          </button>
                          {!mine && (
                            <button onClick={() => handleMessageAction(message, 'report')}>
                              举报
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-white/[0.08] bg-black/20 p-3 sm:p-4"
        >
          <div className="mx-auto max-w-3xl">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-white/[0.05] px-3 py-2 text-xs text-gray-400">
                <span className="truncate">
                  回复 {replyTo.sender.name || '用户'}：{replyTo.content || `[${replyTo.type}]`}
                </span>
                <button type="button" onClick={() => setReplyTo(null)}>取消</button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto">
                {attachments.map((attachment, index) => (
                  <div key={attachment.url} className="relative shrink-0">
                    <Image
                      src={attachment.url}
                      alt="待发送图片"
                      width={72}
                      height={72}
                      unoptimized
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-black text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {blockedEitherWay || otherUser.role === 'banned' ? (
              <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-center text-sm text-red-200/70">
                当前无法发送消息
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={uploadFiles}
                />
                <button
                  type="button"
                  disabled={uploading || attachments.length >= 4}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-white/10 px-3 py-3 text-sm text-gray-400 hover:text-white disabled:opacity-40"
                >
                  {uploading ? '上传中' : '图片'}
                </button>
                <textarea
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    void publishTyping(Boolean(event.target.value.trim()));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={5_000}
                  placeholder="输入消息，Shift + Enter 换行"
                  className="max-h-36 min-h-12 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]/40"
                />
                <button
                  type="submit"
                  disabled={sending || (!content.trim() && attachments.length === 0)}
                  className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? '发送中' : '发送'}
                </button>
              </div>
            )}
          </div>
        </form>
      </section>
      {gamesOpen && (
        <ChatGamePanel
          conversationId={conversationId}
          currentUserId={currentUserId}
          otherUserId={otherUser.id}
          otherUserName={otherUser.name || '聊天对象'}
          initialGame={initialGame}
          initialStats={initialGameStats}
          onClose={() => setGamesOpen(false)}
        />
      )}
    </div>
  );
}
