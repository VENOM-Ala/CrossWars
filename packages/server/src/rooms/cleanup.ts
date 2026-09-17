import type { Server } from 'socket.io';
import { CLEANUP_INTERVAL_MS, ROOM_IDLE_MS } from '../config';
import type { RoomStore } from './store';

export function startCleanupSweep(io: Server, store: RoomStore): ReturnType<typeof setInterval> {
  return setInterval(() => {
    for (const room of store.idleRooms(ROOM_IDLE_MS)) {
      io.to(room.code).emit('room:closed', { reason: 'idle' });
      io.in(room.code).socketsLeave(room.code);
      store.remove(room.code);
    }
  }, CLEANUP_INTERVAL_MS);
}
