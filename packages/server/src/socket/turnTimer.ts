import type { Server } from 'socket.io';
import { applyMove, currentPlayer, randomMove } from '@rps/engine';
import { TURN_TIMER_MS } from '../config';
import type { RoomStore } from '../rooms/store';
import type { Room } from '../rooms/types';
import { broadcastGameViews } from './broadcast';

export function scheduleTurnTimer(io: Server, store: RoomStore, room: Room): void {
  if (room.turnTimeout) {
    clearTimeout(room.turnTimeout);
    room.turnTimeout = null;
  }
  if (room.phase !== 'in-game' || !room.game || room.game.winner || room.game.endedBy) {
    room.turnDeadline = null;
    return;
  }
  room.turnDeadline = Date.now() + TURN_TIMER_MS;
  room.turnTimeout = setTimeout(() => onTurnTimeout(io, store, room), TURN_TIMER_MS);
}

function onTurnTimeout(io: Server, store: RoomStore, room: Room): void {
  if (room.phase !== 'in-game' || !room.game) return;
  const player = currentPlayer(room.game);
  if (!player) return;

  const [move, nextRng] = randomMove(room.game, room.timerRng);
  room.timerRng = nextRng;
  room.game = applyMove(room.game, player.id, move);
  store.touch(room);

  if (room.game.winner || room.game.endedBy) {
    room.phase = 'ended';
  }

  broadcastGameViews(io, room);
  scheduleTurnTimer(io, store, room);
}
