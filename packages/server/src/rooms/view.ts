import type { Room } from './types';

export interface SeatView {
  seat: number;
  playerId: string | null;
  name: string | null;
  ready: boolean;
  connected: boolean;
}

export interface RoomView {
  code: string;
  phase: Room['phase'];
  playerCount: number;
  teamCount: 2 | 3;
  hostPlayerId: string | null;
  seats: SeatView[];
}

export function toRoomView(room: Room): RoomView {
  return {
    code: room.code,
    phase: room.phase,
    playerCount: room.playerCount,
    teamCount: room.teamCount,
    hostPlayerId: room.hostPlayerId,
    seats: room.seats.map((s) => ({
      seat: s.seat,
      playerId: s.playerId,
      name: s.name,
      ready: s.ready,
      connected: s.connected,
    })),
  };
}
