import type { GameState } from '@rps/engine';

export type RoomPhase = 'lobby' | 'in-game' | 'ended';

export interface Seat {
  seat: number;
  playerId: string | null;
  name: string | null;
  ready: boolean;
  connected: boolean;
  socketId: string | null;
  sessionToken: string | null;
}

export interface Room {
  code: string;
  hostPlayerId: string | null;
  playerCount: number;
  teamCount: 2 | 3;
  seats: Seat[];
  phase: RoomPhase;
  game: GameState | null;
  /** Advances each time the auto-forfeit timer picks a move; independent of GameState.rngState. */
  timerRng: number;
  turnDeadline: number | null;
  turnTimeout: ReturnType<typeof setTimeout> | null;
  createdAt: number;
  lastActivityAt: number;
}
