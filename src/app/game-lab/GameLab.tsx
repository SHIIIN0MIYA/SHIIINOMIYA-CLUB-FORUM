'use client';

import { useState } from 'react';

const SIZE = 15;

export default function GameLab() {
  const [board, setBoard] = useState<number[]>(() => Array(SIZE * SIZE).fill(0));
  const [turn, setTurn] = useState(1);

  function place(index: number) {
    if (board[index]) return;
    setBoard((current) => {
      const next = [...current];
      next[index] = turn;
      return next;
    });
    setTurn((current) => (current === 1 ? 2 : 1));
  }

  function reset() {
    setBoard(Array(SIZE * SIZE).fill(0));
    setTurn(1);
  }

  return (
    <main className="min-h-screen bg-[#0b0910] px-4 py-10 text-[#fff3cf]">
      <section className="mx-auto max-w-4xl border-4 border-[#1b1524] bg-[#11101a] p-4 shadow-[8px_8px_0_#000,-4px_-4px_0_#d9a441] sm:p-7">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-4 border-[#242033] pb-5 font-mono">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#d9a441]">
              Game Preview
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">像素五子棋</h1>
            <p className="mt-3 text-sm text-[#9d92a7]">点击棋盘可轮流落子，预览新版视觉效果。</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="border-2 border-[#1b1524] bg-[#d9a441] px-5 py-3 text-sm font-black text-[#1b1524] shadow-[4px_4px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            重新开局
          </button>
        </header>

        <div className="mb-5 flex items-center justify-center gap-5 font-mono text-sm font-black">
          <span className={turn === 1 ? 'text-[#f1c663]' : 'text-[#716681]'}>
            <i className="mr-2 inline-block h-5 w-5 border-2 border-[#211929] bg-[#fff3cf] align-middle shadow-[2px_2px_0_#000]" />
            白方
          </span>
          <span className="text-[#4a4157]">TURN</span>
          <span className={turn === 2 ? 'text-[#f1c663]' : 'text-[#716681]'}>
            <i className="mr-2 inline-block h-5 w-5 border-2 border-[#211929] bg-[#3d3550] align-middle shadow-[2px_2px_0_#000]" />
            黑方
          </span>
        </div>

        <div className="mx-auto aspect-square w-full max-w-[680px] border-4 border-[#3a2918] bg-[#d19a50] p-2 shadow-[7px_7px_0_#000,inset_0_0_0_4px_#e7bb72] sm:p-3">
          <div className="grid h-full grid-cols-[repeat(15,minmax(0,1fr))]">
            {board.map((stone, index) => (
              <button
                key={index}
                type="button"
                onClick={() => place(index)}
                className="group relative flex items-center justify-center"
                aria-label={`棋盘位置 ${index + 1}`}
              >
                <span className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5a3a1c] sm:w-[2px]" />
                <span className="absolute left-0 top-1/2 h-[1px] w-full bg-[#5a3a1c] sm:h-[2px]" />
                {!stone && (
                  <span className="relative z-10 h-[38%] w-[38%] group-hover:bg-[#fff3cf]/40" />
                )}
                {stone > 0 && (
                  <span
                    className={`relative z-10 h-[70%] w-[70%] border-2 border-[#211929] shadow-[2px_2px_0_rgba(0,0,0,0.7)] ${
                      stone === 1 ? 'bg-[#fff3cf]' : 'bg-[#3d3550]'
                    }`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
