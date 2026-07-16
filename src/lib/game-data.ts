import type { Prisma } from '@prisma/client';
import { db } from './db';

export const GAME_TYPES = ['GOMOKU'] as const;
export type GameType = (typeof GAME_TYPES)[number];

export type GameState = Record<string, unknown>;

export type SerializedGame = {
  id: string;
  conversationId: string;
  type: GameType;
  status: string;
  inviterId: string;
  winnerId: string | null;
  state: GameState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type SerializedGameStat = {
  userId: string;
  gameType: GameType;
  wins: number;
  played: number;
};

export async function getConversationGameData(
  conversationId: string,
  currentUserId: string,
) {
  const [game, stats] = await Promise.all([
    db.gameSession.findFirst({
      where: { conversationId, type: 'GOMOKU' },
      orderBy: { updatedAt: 'desc' },
    }),
    db.gameStat.findMany({ where: { conversationId, gameType: 'GOMOKU' } }),
  ]);

  return {
    game: game ? serializeGame(game, currentUserId) : null,
    stats: stats.map((stat) => ({
      userId: stat.userId,
      gameType: stat.gameType as GameType,
      wins: stat.wins,
      played: stat.played,
    })),
    serverNow: Date.now(),
  };
}

export function serializeGame(
  game: {
    id: string;
    conversationId: string;
    type: string;
    status: string;
    inviterId: string;
    winnerId: string | null;
    state: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  },
  currentUserId: string,
): SerializedGame {
  const state = { ...(game.state as GameState) };
  return {
    id: game.id,
    conversationId: game.conversationId,
    type: game.type as GameType,
    status: game.status,
    inviterId: game.inviterId,
    winnerId: game.winnerId,
    state,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    completedAt: game.completedAt?.toISOString() ?? null,
  };
}
