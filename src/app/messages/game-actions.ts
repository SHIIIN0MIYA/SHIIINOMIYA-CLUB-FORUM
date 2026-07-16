'use server';

import type { Prisma } from '@prisma/client';
import { after } from 'next/server';
import { requireUser } from '../../lib/current-user';
import { db } from '../../lib/db';
import {
  GAME_TYPES,
  getConversationGameData,
  type GameState,
  type GameType,
} from '../../lib/game-data';
import { requireConversationMember } from '../../lib/message-data';
import { publishRealtime } from '../../lib/realtime';

const BOARD_SIZE = 15;
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;

function asJson(state: GameState) {
  return state as Prisma.InputJsonValue;
}

async function getPlayers(conversationId: string, userId: string) {
  const membership = await requireConversationMember(conversationId, userId);
  const other = membership.conversation.members.find((item) => item.userId !== userId);
  if (!other) throw new Error('对方不存在');
  return [userId, other.userId] as const;
}

function initialState(inviterId: string, otherId: string): GameState {
  return {
    players: [inviterId, otherId],
    board: Array(BOARD_CELLS).fill(0),
    turnUserId: inviterId,
  };
}

function notifyGame(conversationId: string, gameId: string, actorId: string) {
  after(async () => {
    await publishRealtime(`private:conversation:${conversationId}`, 'game.updated', {
      conversationId,
      gameId,
      actorId,
    });
  });
}

function currentGameData(conversationId: string, userId: string) {
  return getConversationGameData(conversationId, userId);
}

export async function inviteGame(conversationId: string, type: GameType) {
  const user = await requireUser();
  if (!GAME_TYPES.includes(type)) throw new Error('游戏类型无效');
  const [, otherId] = await getPlayers(conversationId, user.id);

  await db.gameSession.updateMany({
    where: { conversationId, status: { in: ['INVITED', 'ACTIVE'] } },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });

  const game = await db.gameSession.create({
    data: {
      conversationId,
      type: 'GOMOKU',
      inviterId: user.id,
      state: asJson(initialState(user.id, otherId)),
    },
  });
  notifyGame(conversationId, game.id, user.id);
  return currentGameData(conversationId, user.id);
}

export async function acceptGame(gameId: string) {
  const user = await requireUser();
  const game = await db.gameSession.findUnique({ where: { id: gameId } });
  if (!game) throw new Error('邀请不存在');
  if (game.type !== 'GOMOKU' || game.status !== 'INVITED') {
    return currentGameData(game.conversationId, user.id);
  }
  await getPlayers(game.conversationId, user.id);
  if (game.inviterId === user.id) throw new Error('请等待对方接受');

  await db.gameSession.update({
    where: { id: gameId },
    data: { status: 'ACTIVE' },
  });
  notifyGame(game.conversationId, gameId, user.id);
  return currentGameData(game.conversationId, user.id);
}

export async function declineGame(gameId: string) {
  const user = await requireUser();
  const game = await db.gameSession.findUnique({ where: { id: gameId } });
  if (!game) return null;
  if (game.type !== 'GOMOKU' || game.status !== 'INVITED') {
    return currentGameData(game.conversationId, user.id);
  }
  await getPlayers(game.conversationId, user.id);
  await db.gameSession.update({
    where: { id: gameId },
    data: { status: 'DECLINED', completedAt: new Date() },
  });
  notifyGame(game.conversationId, gameId, user.id);
  return currentGameData(game.conversationId, user.id);
}

export async function forfeitGame(gameId: string) {
  const user = await requireUser();
  const game = await db.gameSession.findUnique({ where: { id: gameId } });
  if (!game) return null;
  if (game.type !== 'GOMOKU' || game.status !== 'ACTIVE') {
    return currentGameData(game.conversationId, user.id);
  }
  await getPlayers(game.conversationId, user.id);
  const state: GameState = { ...(game.state as GameState), forfeitedBy: user.id };
  const players = state.players as string[];
  const otherId = players.find((id) => id !== user.id);
  if (!otherId) throw new Error('对方不存在');

  await db.gameSession.update({
    where: { id: gameId },
    data: { state: asJson(state) },
  });
  await finishGame({ ...game, state }, otherId);
  notifyGame(game.conversationId, gameId, user.id);
  return currentGameData(game.conversationId, user.id);
}

async function finishGame(
  game: { id: string; conversationId: string; type: string; state: unknown },
  winnerId: string | null,
) {
  const players = (game.state as GameState).players as string[];
  await db.$transaction(async (tx) => {
    const claimed = await tx.gameSession.updateMany({
      where: { id: game.id, status: 'ACTIVE' },
      data: { status: 'COMPLETED', winnerId, completedAt: new Date() },
    });
    if (claimed.count === 0) return;

    for (const userId of players) {
      await tx.gameStat.upsert({
        where: {
          conversationId_userId_gameType: {
            conversationId: game.conversationId,
            userId,
            gameType: 'GOMOKU',
          },
        },
        update: {
          played: { increment: 1 },
          wins: winnerId === userId ? { increment: 1 } : undefined,
        },
        create: {
          conversationId: game.conversationId,
          userId,
          gameType: 'GOMOKU',
          played: 1,
          wins: winnerId === userId ? 1 : 0,
        },
      });
    }
  });
}

function gomokuWinner(board: number[], index: number, stone: number) {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    for (const direction of [-1, 1]) {
      let r = row + dr * direction;
      let c = column + dc * direction;
      while (
        r >= 0 &&
        r < BOARD_SIZE &&
        c >= 0 &&
        c < BOARD_SIZE &&
        board[r * BOARD_SIZE + c] === stone
      ) {
        count += 1;
        r += dr * direction;
        c += dc * direction;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

export async function playGameAction(
  gameId: string,
  action: { type: 'PLACE'; index: number },
) {
  const user = await requireUser();
  const game = await db.gameSession.findUnique({ where: { id: gameId } });
  if (!game) throw new Error('对局不存在');
  if (game.type !== 'GOMOKU' || game.status !== 'ACTIVE') {
    return currentGameData(game.conversationId, user.id);
  }
  await getPlayers(game.conversationId, user.id);

  const state = { ...(game.state as GameState) };
  const players = state.players as string[];
  const otherId = players.find((id) => id !== user.id);
  if (!otherId) throw new Error('对方不存在');

  const board = [...(state.board as number[])];
  if (state.turnUserId !== user.id) throw new Error('还没有轮到你');
  if (
    !Number.isInteger(action.index) ||
    action.index < 0 ||
    action.index >= BOARD_CELLS ||
    board[action.index]
  ) {
    throw new Error('该位置不能落子');
  }

  const stone = players.indexOf(user.id) + 1;
  board[action.index] = stone;
  state.board = board;
  state.turnUserId = otherId;

  await db.gameSession.update({
    where: { id: gameId },
    data: { state: asJson(state) },
  });
  if (gomokuWinner(board, action.index, stone)) {
    await finishGame({ ...game, state }, user.id);
  } else if (board.every(Boolean)) {
    await finishGame({ ...game, state }, null);
  }

  notifyGame(game.conversationId, gameId, user.id);
  return currentGameData(game.conversationId, user.id);
}
