'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'waiting' | 'ready' | 'finished';
type Player = 1 | 2;

export function ReactionPreview() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [winner, setWinner] = useState<Player | null>(null);
  const [message, setMessage] = useState('点击开始，等待信号变绿后抢按');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [wins, setWins] = useState({ first: 0, second: 0 });
  const phaseRef = useRef<Phase>('idle');
  const signalTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const finish = useCallback((player: Player, text: string, time: number | null) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    phaseRef.current = 'finished';
    setPhase('finished');
    setWinner(player);
    setMessage(text);
    setReactionTime(time);
    setWins((current) => ({
      first: current.first + (player === 1 ? 1 : 0),
      second: current.second + (player === 2 ? 1 : 0),
    }));
  }, []);

  const press = useCallback(
    (player: Player) => {
      const currentPhase = phaseRef.current;
      if (currentPhase === 'waiting') {
        const opponent = player === 1 ? 2 : 1;
        finish(
          opponent,
          `${player === 1 ? '你' : '聊天对象'}提前抢按，对方获胜`,
          null,
        );
        return;
      }
      if (currentPhase === 'ready') {
        const time = Math.max(0, Math.round(performance.now() - signalTimeRef.current));
        finish(player, `${player === 1 ? '你' : '聊天对象'}率先按下`, time);
      }
    },
    [finish],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.code === 'KeyA') press(1);
      if (event.code === 'KeyL') press(2);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [press]);

  function startRound() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setWinner(null);
    setReactionTime(null);
    setMessage('等待中，不要提前按');
    phaseRef.current = 'waiting';
    setPhase('waiting');
    const delay = 1400 + Math.floor(Math.random() * 2600);
    timerRef.current = window.setTimeout(() => {
      signalTimeRef.current = performance.now();
      phaseRef.current = 'ready';
      setPhase('ready');
      setMessage('现在按！');
    }, delay);
  }

  const arenaTone =
    phase === 'ready'
      ? 'border-emerald-300/50 bg-emerald-400/[0.14] shadow-[0_0_80px_rgba(52,211,153,0.16)]'
      : phase === 'waiting'
        ? 'border-rose-300/20 bg-rose-400/[0.04]'
        : 'border-white/[0.08] bg-white/[0.035]';

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className={`relative min-h-[580px] overflow-hidden rounded-3xl border transition duration-300 ${arenaTone}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="relative flex min-h-[580px] flex-col items-center justify-between p-6 sm:p-10">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Reaction signal</p>
            <h2 className={`mt-5 text-4xl font-semibold sm:text-6xl ${
              phase === 'ready' ? 'text-emerald-300' : 'text-white'
            }`}>
              {phase === 'ready' ? '按！' : phase === 'waiting' ? '等待' : phase === 'finished' ? '本局结束' : '准备'}
            </h2>
            <p className="mt-4 text-sm text-gray-400">{message}</p>
            {reactionTime !== null && (
              <p className="mt-3 font-mono text-2xl text-[var(--accent)]">{reactionTime} ms</p>
            )}
          </div>

          <div className="grid w-full max-w-3xl grid-cols-2 gap-4">
            <ReactionButton
              label="你"
              keyName="A"
              active={winner === 1}
              disabled={phase === 'idle' || phase === 'finished'}
              onClick={() => press(1)}
              tone="gold"
            />
            <ReactionButton
              label="聊天对象"
              keyName="L"
              active={winner === 2}
              disabled={phase === 'idle' || phase === 'finished'}
              onClick={() => press(2)}
              tone="blue"
            />
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <ReactionScoreboard first={wins.first} second={wins.second} />
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Rules</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-400">
            <li>信号会在随机时间变绿。</li>
            <li>变绿后最先按键的一方获胜。</li>
            <li>提前抢按会直接判对方获胜。</li>
          </ul>
          <button
            type="button"
            onClick={startRound}
            disabled={phase === 'waiting' || phase === 'ready'}
            className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            {phase === 'finished' ? '下一局' : phase === 'idle' ? '开始对决' : '等待信号'}
          </button>
        </div>
        <p className="rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.035] p-4 text-xs leading-6 text-cyan-50/55">
          正式联机版会由服务端发送统一信号时间，并根据服务器时间戳判定先后，减少双方网络延迟造成的不公平。
        </p>
      </aside>
    </section>
  );
}

function ReactionButton({
  label,
  keyName,
  active,
  disabled,
  onClick,
  tone,
}: {
  label: string;
  keyName: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  tone: 'gold' | 'blue';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-48 rounded-2xl border p-5 text-center transition active:scale-[0.98] disabled:cursor-not-allowed ${
        active
          ? tone === 'gold'
            ? 'border-amber-200/50 bg-amber-200/[0.16]'
            : 'border-blue-300/50 bg-blue-300/[0.16]'
          : 'border-white/10 bg-black/20 hover:bg-white/[0.05]'
      }`}
    >
      <span className="block text-lg font-medium">{label}</span>
      <kbd className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-xl border border-white/15 bg-black/30 font-mono text-2xl">
        {keyName}
      </kbd>
      <span className="mt-4 block text-xs text-gray-500">点击区域或按键</span>
    </button>
  );
}

function ReactionScoreboard({ first, second }: { first: number; second: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="text-right">
        <p className="text-xs text-gray-500">你</p>
        <p className="font-mono text-3xl font-semibold text-[var(--accent)]">{first}</p>
      </div>
      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">
        Wins
      </span>
      <div>
        <p className="text-xs text-gray-500">聊天对象</p>
        <p className="font-mono text-3xl font-semibold text-blue-300">{second}</p>
      </div>
    </div>
  );
}
