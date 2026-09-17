import type { Server, Socket } from 'socket.io';
import type { RoomStore } from '../rooms/store';
import { registerLobbyHandlers } from './lobby';
import { registerGameHandlers } from './game';
import type { SocketData } from './types';

export function registerSocketHandlers(io: Server, store: RoomStore): void {
  io.on('connection', (socket: Socket<any, any, any, SocketData>) => {
    registerLobbyHandlers(io, store, socket);
    registerGameHandlers(io, store, socket);
  });
}
