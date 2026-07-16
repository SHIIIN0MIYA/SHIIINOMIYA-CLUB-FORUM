'use client';

import { useState } from 'react';
import { updateMessagingPreference } from '../messages/actions';

const OPTIONS = [
  { value: 'EVERYONE', label: '所有正常用户' },
  { value: 'INTERACTIONS', label: '仅互动过的用户' },
  { value: 'NONE', label: '禁止新私信' },
];

export default function MessagePrivacyForm({
  initialValue,
}: {
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(nextValue: string) {
    setValue(nextValue);
    setSaving(true);
    setSaved(false);
    try {
      await updateMessagingPreference(nextValue);
      setSaved(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '保存失败');
      setValue(initialValue);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <select
        value={value}
        disabled={saving}
        onChange={(event) => save(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#0b0d14] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]/50"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">
        {saved ? '设置已保存。' : '已存在的会话仍可查看；屏蔽规则优先于此设置。'}
      </p>
    </div>
  );
}
