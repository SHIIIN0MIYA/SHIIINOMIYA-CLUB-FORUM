'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toggleBanUser } from '../../actions';
import {
  resolveMessageReport,
  warnMessageSender,
} from '../../messages/actions';

export default function AdminReportActions({
  reportId,
  messageId,
  senderId,
  senderRole,
}: {
  reportId: string;
  messageId: string;
  senderId: string;
  senderRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(action: 'resolve' | 'dismiss' | 'warn' | 'ban') {
    setLoading(true);
    try {
      if (action === 'resolve' || action === 'dismiss') {
        const note = window.prompt('处理备注（可留空）') || '';
        await resolveMessageReport(
          reportId,
          action === 'resolve' ? 'RESOLVED' : 'DISMISSED',
          note
        );
      }
      if (action === 'warn') {
        const warning = window.prompt('请输入发送给该用户的警告内容');
        if (!warning) return;
        await warnMessageSender(messageId, warning);
        window.alert('警告已发送');
      }
      if (action === 'ban') {
        if (!window.confirm('确定封禁该消息发送者？')) return;
        await toggleBanUser(senderId);
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={loading}
        onClick={() => run('resolve')}
        className="rounded-lg border border-emerald-400/20 px-2.5 py-1.5 text-xs text-emerald-300"
      >
        解决
      </button>
      <button
        disabled={loading}
        onClick={() => run('dismiss')}
        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300"
      >
        驳回
      </button>
      <button
        disabled={loading}
        onClick={() => run('warn')}
        className="rounded-lg border border-amber-400/20 px-2.5 py-1.5 text-xs text-amber-300"
      >
        警告
      </button>
      {senderRole !== 'admin' && senderRole !== 'banned' && (
        <button
          disabled={loading}
          onClick={() => run('ban')}
          className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs text-red-300"
        >
          封禁
        </button>
      )}
    </div>
  );
}
