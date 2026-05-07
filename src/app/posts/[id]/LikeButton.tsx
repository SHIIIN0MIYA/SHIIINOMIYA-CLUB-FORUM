'use client';

import { useState } from 'react';
import { toggleLike } from '../../actions';

interface LikeButtonProps {
  postId: string;
  initialLikes: number;
  initialLiked: boolean;
}

export default function LikeButton({ postId, initialLikes, initialLiked }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);

    // 乐观更新
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);

    try {
      await toggleLike(postId);
    } catch {
      // 失败时恢复
      setLiked(liked);
      setLikes(initialLikes);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={`flex items-center gap-1 text-sm transition-colors ${
        liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
      }`}
    >
      ❤️ {likes}
    </button>
  );
}