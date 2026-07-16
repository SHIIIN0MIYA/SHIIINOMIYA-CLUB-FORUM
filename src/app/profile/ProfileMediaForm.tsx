'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileImages } from '../actions';

interface ProfileMediaFormProps {
  initialImage: string | null;
  initialBackgroundImage: string | null;
  displayName: string;
}

export default function ProfileMediaForm({
  initialImage,
  initialBackgroundImage,
  displayName,
}: ProfileMediaFormProps) {
  const [image, setImage] = useState(initialImage || '');
  const [backgroundImage, setBackgroundImage] = useState(initialBackgroundImage || '');
  const [uploading, setUploading] = useState<'avatar' | 'background' | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const avatarInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File, purpose: 'avatar' | 'background') {
    setError('');
    setMessage('');
    setUploading(purpose);
    const formData = new FormData();
    formData.set('file', file);
    formData.set('purpose', purpose);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '上传失败');
      if (purpose === 'avatar') setImage(result.url);
      else setBackgroundImage(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传失败');
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    const formData = new FormData();
    formData.set('image', image);
    formData.set('backgroundImage', backgroundImage);

    try {
      await updateProfileImages(formData);
      setMessage('头像和主页背景已保存');
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div
        className="relative h-44 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent"
        style={
          backgroundImage
            ? { backgroundImage: `url("${backgroundImage}")`, backgroundPosition: 'center', backgroundSize: 'cover' }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute bottom-4 left-4 flex items-end gap-3">
          {image ? (
            <Image
              src={image}
              alt={displayName}
              width={72}
              height={72}
              unoptimized
              className="h-[72px] w-[72px] rounded-full border-2 border-black/50 object-cover"
            />
          ) : (
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-black/50 bg-[var(--accent)] text-2xl font-bold text-black">
              {displayName[0]}
            </span>
          )}
          <strong className="mb-2 text-lg text-white drop-shadow">{displayName}</strong>
        </div>
      </div>

      <input
        ref={avatarInput}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file, 'avatar');
          event.target.value = '';
        }}
      />
      <input
        ref={backgroundInput}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file, 'background');
          event.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={uploading !== null}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          {uploading === 'avatar' ? '上传中...' : '更换头像'}
        </button>
        <button
          type="button"
          onClick={() => backgroundInput.current?.click()}
          disabled={uploading !== null}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          {uploading === 'background' ? '上传中...' : '更换背景'}
        </button>
        {image && (
          <button type="button" onClick={() => setImage('')} className="px-3 py-2 text-sm text-gray-400 hover:text-white">
            移除头像
          </button>
        )}
        {backgroundImage && (
          <button type="button" onClick={() => setBackgroundImage('')} className="px-3 py-2 text-sm text-gray-400 hover:text-white">
            移除背景
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving || uploading !== null}
        className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存个人形象'}
      </button>
      {message && <p className="text-sm text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
