import type { Server, Socket } from 'socket.io';
import { IllegalMoveError, applyMove } from '@rps/engine';
import type { RoomStore } from '../rooms/store';
import { broadcastGameViews, broadcastRoomState } from './broadcast';
import { moveSchema, rematchSchema } from '../schemas';
import { scheduleTurnTimer } from './turnTimer';
import type { AckFn, SocketData } from './types';

export function registerGameHandlers(io: Server, store: RoomStore, socket: Socket<any, any, any, SocketData>): void {
  socket.on('game:move', (payload: unknown, ack: AckFn<Record<string, unknown>>) => {
    const room = store.get(socket.data.roomCode ?? '');
    if (!room || room.phase !== 'in-game' || !room.game) {
      return ack({ ok: false, error: 'No game in progress' });
    }
    const parsed = moveSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: 'Invalid move' });
    const playerId = socket.data.playerId;
    if (!playerId) return ack({ ok: false, error: 'Not seated in this room' });

    try {
      room.game = applyMove(room.game, playerId, parsed.data);
    } catch (err) {
      if (err instanceof IllegalMoveError) return ack({ ok: false, error: err.message });
      throw err;
    }
    store.touch(room);

    if (room.game.winner || room.game.endedBy) {
      room.phase = 'ended';
      broadcastRoomState(io, room);
    }

    ack({ ok: true });
    broadcastGameViews(io, room);
    scheduleTurnTimer(io, store, room);
  });

  socket.on('game:rematch', (payload: unknown, ack: AckFn<Record<string, unknown>>) => {
    const room = store.get(socket.data.roomCode ?? '');
    if (!room || room.phase !== 'ended') return ack({ ok: false, error: 'Game has not ended' });
    if (room.hostPlayerId !== socket.data.playerId) return ack({ ok: false, error: 'Only the host can start a rematch' });
    const parsed = rematchSchema.safeParse(payload ?? {});
    if (!parsed.success) return ack({ ok: false, error: 'Invalid request' });

    room.game = null;
    room.phase = 'lobby';
    room.turnDeadline = null;
    if (room.turnTimeout) {
      clearTimeout(room.turnTimeout);
      room.turnTimeout = null;
    }
    for (const seat of room.seats) seat.ready = false;
    store.touch(room);

    ack({ ok: true });
    broadcastRoomState(io, room);
  });
}
