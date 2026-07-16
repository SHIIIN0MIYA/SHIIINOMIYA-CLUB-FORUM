import type { Metadata } from 'next';
import GameLab from './GameLab';

export const metadata: Metadata = {
  title: '像素五子棋预览 | SHIIIINOMIYA',
  description: '私聊双人像素风五子棋预览',
};

export default function GameLabPage() {
  return <GameLab />;
}
