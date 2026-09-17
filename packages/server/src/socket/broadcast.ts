import type { Server } from 'socket.io';
import { viewFor } from '@rps/engine';
import type { Room } from '../rooms/types';
import { toRoomView } from '../rooms/view';

export function broadcastRoomState(io: Server, room: Room): void {
  io.to(room.code).emit('room:state', toRoomView(room));
}

export function broadcastGameViews(io: Server, room: Room): void {
  if (!room.game) return;
  const game = room.game;
  for (const seat of room.seats) {
    if (!seat.playerId || !seat.socketId) continue;
    io.to(seat.socketId).emit('game:view', {
      view: viewFor(game, seat.playerId),
      turnDeadline: room.turnDeadline,
      roomCode: room.code,
      hostPlayerId: room.hostPlayerId,
    });
  }
}
