import type { EndReason, Move, PlayerView, Team } from '@rps/engine';

export type Ack<T extends object> = ({ ok: true } & T) | { ok: false; error: string };

export interface CreateRoomPayload {
  playerCount: number;
  teamCount?: 2 | 3;
  name: string;
}
export interface JoinRoomPayload {
  code: string;
  name: string;
}
export interface ReconnectPayload {
  token: string;
}
export interface SeatPickPayload {
  seat: number;
}
export interface ReadyPayload {
  ready: boolean;
}

export type CreateRoomAck = Ack<{ code: string; token: string; playerId: string; seat: number }>;
export type JoinRoomAck = Ack<{ code: string; token: string; playerId: string; seat: number }>;
export type ReconnectAck = Ack<{ code: string; playerId: string; seat: number; phase: RoomPhase }>;
export type SimpleAck = Ack<Record<string, never>>;

export type RoomPhase = 'lobby' | 'in-game' | 'ended';

export interface SeatView {
  seat: number;
  playerId: string | null;
  name: string | null;
  ready: boolean;
  connected: boolean;
}

export interface RoomView {
  code: string;
  phase: RoomPhase;
  playerCount: number;
  teamCount: 2 | 3;
  hostPlayerId: string | null;
  seats: SeatView[];
}

export interface GameViewPayload {
  view: PlayerView;
  turnDeadline: number | null;
  roomCode: string;
  hostPlayerId: string | null;
}

export interface RoomClosedPayload {
  reason: string;
}

export type { Team, EndReason, PlayerView, Move };
