'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  GameState,
  SerializedGame,
  SerializedGameStat,
} from '../../../lib/game-data';
import {
  acceptGame,
  declineGame,
  forfeitGame,
  inviteGame,
  playGameAction,
} from '../game-actions';

interface ChatGamePanelProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  initialGame: SerializedGame | null;
  initialStats: SerializedGameStat[];
  onClose: () => void;
}

type GameData = {
  game: SerializedGame | null;
  stats: SerializedGameStat[];
  serverNow: number;
};

const pixelPanel =
  'border-4 border-[#1b1524] bg-[#11101a] shadow-[6px_6px_0_#000,-3px_-3px_0_#d9a441]';
const pixelButton =
  'border-2 border-[#1b1524] bg-[#d9a441] px-4 py-3 font-mono text-sm font-black uppercase tracking-wider text-[#1b1524] shadow-[4px_4px_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40';

export default function ChatGamePanel({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  initialGame,
  initialStats,
  onClose,
}: ChatGamePanelProps) {
  const [game, setGame] = useState(initialGame);
  const [stats, setStats] = useState(initialStats);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const applyData = useCallback((data: GameData) => {
    setGame(data.game);
    setStats(data.stats);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/messages/${conversationId}/game`, {
      cache: 'no-store',
    });
    if (response.ok) applyData(await response.json());
  }, [applyData, conversationId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(refresh, 12_000);
    window.addEventListener('chat-game-updated', refresh);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener('chat-game-updated', refresh);
    };
  }, [refresh]);

  async function run(action: () => Promise<GameData | null>) {
    setPending(true);
    setError('');
    try {
      const result = await action();
      if (result) applyData(result);
      else await refresh();
    } catch (caught) {
      await refresh();
      const message = caught instanceof Error ? caught.message : '';
      setError(
        message.includes('Server Components') || message.includes('digest')
          ? '对局状态已同步，请再试一次'
          : message || '网络波动，请再试一次',
      );
    } finally {
      setPending(false);
    }
  }

  const gomokuGame = game?.type === 'GOMOKU' ? game : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
      <section className={`flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden ${pixelPanel}`}>
        <header className="flex shrink-0 items-center justify-between border-b-4 border-[#1b1524] bg-[#242033] px-4 py-3 sm:px-6">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#d9a441]">
              Pixel Gomoku
            </p>
            <h2 className="mt-1 font-mono text-base font-black text-[#fff3cf] sm:text-xl">
              VS {otherUserName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-[#716681] bg-[#171420] px-3 py-2 font-mono text-xs font-bold text-[#d8cfdf] shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            关闭 [X]
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(45deg,#0d0c14_25%,transparent_25%,transparent_75%,#0d0c14_75%),linear-gradient(45deg,#0d0c14_25%,#11101a_25%,#11101a_75%,#0d0c14_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-4 sm:p-7">
          {gomokuGame?.status === 'INVITED' ? (
            <Invitation
              game={gomokuGame}
              currentUserId={currentUserId}
              pending={pending}
              onAccept={() => run(() => acceptGame(gomokuGame.id))}
              onDecline={() => run(() => declineGame(gomokuGame.id))}
            />
          ) : gomokuGame?.status === 'ACTIVE' ? (
            <ActiveGomoku
              game={gomokuGame}
              currentUserId={currentUserId}
              otherUserName={otherUserName}
              pending={pending}
              onPlace={(index) =>
                run(() => playGameAction(gomokuGame.id, { type: 'PLACE', index }))
              }
              onForfeit={() => run(() => forfeitGame(gomokuGame.id))}
            />
          ) : (
            <GameLobby
              currentUserId={currentUserId}
              otherUserId={otherUserId}
              otherUserName={otherUserName}
              stats={stats}
              lastGame={gomokuGame}
              pending={pending}
              onInvite={() => run(() => inviteGame(conversationId, 'GOMOKU'))}
            />
          )}
          {error && (
            <p className="mt-5 border-2 border-[#7d3038] bg-[#2a1118] p-3 text-center font-mono text-xs font-bold text-[#ff8791]">
              ERROR: {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Invitation({
  game,
  currentUserId,
  pending,
  onAccept,
  onDecline,
}: {
  game: SerializedGame;
  currentUserId: string;
  pending: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const mine = game.inviterId === currentUserId;
  return (
    <div className={`mx-auto max-w-lg p-6 text-center sm:p-10 ${pixelPanel}`}>
      <div className="mx-auto grid h-14 w-14 grid-cols-3 grid-rows-3 gap-1">
        {[1, 0, 2, 0, 1, 0, 2, 0, 1].map((stone, index) => (
          <span
            key={index}
            className={
              stone === 1
                ? 'bg-[#fff3cf]'
                : stone === 2
                  ? 'bg-[#433b58]'
                  : 'bg-[#242033]'
            }
          />
        ))}
      </div>
      <p className="mt-6 font-mono text-xs font-black uppercase tracking-[0.28em] text-[#d9a441]">
        Game Invite
      </p>
      <h3 className="mt-3 font-mono text-3xl font-black text-[#fff3cf]">五子棋</h3>
      <p className="mt-4 font-mono text-sm text-[#aaa0b4]">
        {mine ? '邀请已发送，等待对方加入...' : '对方向你发起了五子棋挑战！'}
      </p>
      {mine ? (
        <button type="button" disabled={pending} onClick={onDecline} className={`mt-7 ${pixelButton}`}>
          取消邀请
        </button>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={pending}
            onClick={onDecline}
            className="border-2 border-[#716681] bg-[#242033] px-4 py-3 font-mono text-sm font-black text-[#d8cfdf] shadow-[4px_4px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            拒绝
          </button>
          <button type="button" disabled={pending} onClick={onAccept} className={pixelButton}>
            接受挑战
          </button>
        </div>
      )}
    </div>
  );
}

function GameLobby({
  currentUserId,
  otherUserId,
  otherUserName,
  stats,
  lastGame,
  pending,
  onInvite,
}: {
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  stats: SerializedGameStat[];
  lastGame: SerializedGame | null;
  pending: boolean;
  onInvite: () => void;
}) {
  const mine = stats.find((item) => item.userId === currentUserId);
  const theirs = stats.find((item) => item.userId === otherUserId);

  return (
    <div className={`mx-auto max-w-2xl p-5 sm:p-8 ${pixelPanel}`}>
      <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-[#4a4157] pb-5">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-[#d9a441]">
            Ready Player
          </p>
          <h3 className="mt-2 font-mono text-3xl font-black text-[#fff3cf]">五子棋</h3>
        </div>
        <div className="grid h-16 w-16 grid-cols-5 gap-1 border-2 border-[#6f5831] bg-[#c9944d] p-1 shadow-[4px_4px_0_#000]">
          {Array.from({ length: 25 }, (_, index) => (
            <span
              key={index}
              className={`${[2, 7, 12, 13, 18].includes(index) ? 'bg-[#201a2b]' : 'bg-[#e0ad62]'}`}
            />
          ))}
        </div>
      </div>

      <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 font-mono">
        <ScoreCard label="YOU" name="你" wins={mine?.wins ?? 0} />
        <span className="text-xl font-black text-[#6f6579]">VS</span>
        <ScoreCard label="RIVAL" name={otherUserName} wins={theirs?.wins ?? 0} />
      </div>

      {lastGame?.status === 'COMPLETED' && (
        <p className="mb-5 border-2 border-[#4a4157] bg-[#191622] p-3 text-center font-mono text-xs font-bold text-[#c8becf]">
          上一局：
          {lastGame.winnerId
            ? lastGame.winnerId === currentUserId
              ? '你获胜'
              : `${otherUserName} 获胜`
            : '平局'}
        </p>
      )}

      <button type="button" disabled={pending} onClick={onInvite} className={`w-full ${pixelButton}`}>
        {pending ? '连接中...' : '发起挑战'}
      </button>
    </div>
  );
}

function ScoreCard({ label, name, wins }: { label: string; name: string; wins: number }) {
  return (
    <div className="min-w-0 border-2 border-[#4a4157] bg-[#191622] p-3 text-center shadow-[3px_3px_0_#000]">
      <p className="text-[9px] font-black tracking-[0.2em] text-[#82778d]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[#ddd3e3]">{name}</p>
      <p className="mt-2 text-2xl font-black text-[#d9a441]">{wins} WINS</p>
    </div>
  );
}

function ActiveGomoku({
  game,
  currentUserId,
  otherUserName,
  pending,
  onPlace,
  onForfeit,
}: {
  game: SerializedGame;
  currentUserId: string;
  otherUserName: string;
  pending: boolean;
  onPlace: (index: number) => void;
  onForfeit: () => void;
}) {
  const state = game.state as GameState;
  const board = state.board as number[];
  const players = state.players as string[];
  const myStone = players.indexOf(currentUserId) + 1;
  const myTurn = state.turnUserId === currentUserId;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="border-2 border-[#4a4157] bg-[#191622] px-4 py-2 shadow-[3px_3px_0_#000]">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#82778d]">Status</p>
          <p className={`mt-1 text-sm font-black ${myTurn ? 'text-[#f1c663]' : 'text-[#aaa0b4]'}`}>
            {myTurn ? '你的回合' : `等待 ${otherUserName}`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-[#aaa0b4]">
          <span className={`inline-block h-5 w-5 border-2 border-[#1b1524] shadow-[2px_2px_0_#000] ${myStone === 1 ? 'bg-[#fff3cf]' : 'bg-[#3d3550]'}`} />
          你的棋子
          <button
            type="button"
            disabled={pending}
            onClick={onForfeit}
            className="ml-2 border-2 border-[#64323a] bg-[#2a1118] px-3 py-2 text-[#e7838d] shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            认输
          </button>
        </div>
      </div>

      <div className="mx-auto aspect-square w-full max-w-[650px] border-4 border-[#3a2918] bg-[#d19a50] p-2 shadow-[7px_7px_0_#000,inset_0_0_0_4px_#e7bb72] sm:p-3">
        <div className="grid h-full w-full grid-cols-[repeat(15,minmax(0,1fr))]">
          {board.map((stone, index) => (
            <button
              key={index}
              type="button"
              disabled={pending || !myTurn || Boolean(stone)}
              onClick={() => onPlace(index)}
              className="group relative flex items-center justify-center disabled:cursor-default"
              aria-label={`棋盘位置 ${index + 1}`}
            >
              <span className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5a3a1c] sm:w-[2px]" />
              <span className="absolute left-0 top-1/2 h-[1px] w-full bg-[#5a3a1c] sm:h-[2px]" />
              {!stone && myTurn && (
                <span className="relative z-10 h-[38%] w-[38%] bg-[#fff3cf]/0 group-enabled:group-hover:bg-[#fff3cf]/40" />
              )}
              {stone > 0 && (
                <span
                  className={`relative z-10 h-[70%] w-[70%] border-2 border-[#211929] shadow-[2px_2px_0_rgba(0,0,0,0.7)] ${
                    stone === 1 ? 'bg-[#fff3cf]' : 'bg-[#3d3550]'
                  } ${stone === myStone ? 'outline outline-1 outline-[#f1c663]' : ''}`}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#716681]">
        Connect five stones to win
      </p>
    </div>
  );
}
