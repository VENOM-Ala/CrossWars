import { nanoid } from 'nanoid';
import type { Server, Socket } from 'socket.io';
import { createGame, seedFromString } from '@rps/engine';
import type { RoomStore } from '../rooms/store';
import type { Room, Seat } from '../rooms/types';
import { broadcastGameViews, broadcastRoomState } from './broadcast';
import {
  createRoomSchema,
  joinRoomSchema,
  pickSeatSchema,
  readySchema,
  reconnectSchema,
  startSchema,
} from '../schemas';
import { scheduleTurnTimer } from './turnTimer';
import type { AckFn, SocketData } from './types';

function findSeat(room: Room, playerId: string | undefined): Seat | undefined {
  return room.seats.find((s) => s.playerId === playerId);
}

function joinSocketToRoom(socket: Socket<any, any, any, SocketData>, room: Room, playerId: string): void {
  socket.data.playerId = playerId;
  socket.data.roomCode = room.code;
  socket.join(room.code);
}

export function registerLobbyHandlers(io: Server, store: RoomStore, socket: Socket<any, any, any, SocketData>): void {
  socket.on(
    'room:create',
    (
      payload: unknown,
      ack: AckFn<{ code: string; token: string; playerId: string; seat: number }>,
    ) => {
      const parsed = createRoomSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'Invalid request' });

      let room: Room;
      try {
        room = store.create(parsed.data.playerCount, parsed.data.teamCount);
      } catch (err) {
        return ack({ ok: false, error: (err as Error).message });
      }

      const playerId = nanoid();
      const token = nanoid(24);
      const seat = room.seats[0];
      seat.playerId = playerId;
      seat.name = parsed.data.name;
      seat.ready = false;
      seat.connected = true;
      seat.socketId = socket.id;
      seat.sessionToken = token;
      room.hostPlayerId = playerId;
      store.registerSession(token, room.code, playerId);
      store.touch(room);

      joinSocketToRoom(socket, room, playerId);
      ack({ ok: true, code: room.code, token, playerId, seat: seat.seat });
      broadcastRoomState(io, room);
    },
  );

  socket.on(
    'room:join',
    (
      payload: unknown,
      ack: AckFn<{ code: string; token: string; playerId: string; seat: number }>,
    ) => {
      const parsed = joinRoomSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'Invalid request' });

      const room = store.get(parsed.data.code);
      if (!room) return ack({ ok: false, error: 'Room not found' });
      if (room.phase !== 'lobby') return ack({ ok: false, error: 'Game already started' });
      const openSeat = room.seats.find((s) => s.playerId === null);
      if (!openSeat) return ack({ ok: false, error: 'Room is full' });

      const playerId = nanoid();
      const token = nanoid(24);
      openSeat.playerId = playerId;
      openSeat.name = parsed.data.name;
      openSeat.ready = false;
      openSeat.connected = true;
      openSeat.socketId = socket.id;
      openSeat.sessionToken = token;
      store.registerSession(token, room.code, playerId);
      store.touch(room);

      joinSocketToRoom(socket, room, playerId);
      ack({ ok: true, code: room.code, token, playerId, seat: openSeat.seat });
      broadcastRoomState(io, room);
    },
  );

  socket.on(
    'room:reconnect',
    (
      payload: unknown,
      ack: AckFn<{ code: string; playerId: string; seat: number; phase: Room['phase'] }>,
    ) => {
      const parsed = reconnectSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'Invalid request' });

      const session = store.resolveSession(parsed.data.token);
      if (!session) return ack({ ok: false, error: 'Unknown session' });
      const room = store.get(session.code);
      if (!room) {
        store.dropSession(parsed.data.token);
        return ack({ ok: false, error: 'Room no longer exists' });
      }
      const seat = findSeat(room, session.playerId);
      if (!seat) return ack({ ok: false, error: 'Seat not found' });

      seat.connected = true;
      seat.socketId = socket.id;
      store.touch(room);
      joinSocketToRoom(socket, room, session.playerId);

      ack({ ok: true, code: room.code, playerId: session.playerId, seat: seat.seat, phase: room.phase });
      if (room.phase === 'lobby') {
        broadcastRoomState(io, room);
      } else if (room.game) {
        broadcastGameViews(io, room);
      }
    },
  );

  socket.on('seat:pick', (payload: unknown, ack: AckFn<Record<string, unknown>>) => {
    const room = store.get(socket.data.roomCode ?? '');
    if (!room || room.phase !== 'lobby') return ack({ ok: false, error: 'Not in a lobby' });
    const parsed = pickSeatSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: 'Invalid request' });

    const mySeat = findSeat(room, socket.data.playerId);
    if (!mySeat) return ack({ ok: false, error: 'Not seated in this room' });
    const target = room.seats[parsed.data.seat];
    if (!target) return ack({ ok: false, error: 'No such seat' });
    if (target.playerId !== null) return ack({ ok: false, error: 'Seat is taken' });

    target.playerId = mySeat.playerId;
    target.name = mySeat.name;
    target.ready = false;
    target.connected = mySeat.connected;
    target.socketId = mySeat.socketId;
    target.sessionToken = mySeat.sessionToken;
    mySeat.playerId = null;
    mySeat.name = null;
    mySeat.ready = false;
    mySeat.connected = false;
    mySeat.socketId = null;
    mySeat.sessionToken = null;
    store.touch(room);

    ack({ ok: true });
    broadcastRoomState(io, room);
  });

  socket.on('player:ready', (payload: unknown, ack: AckFn<Record<string, unknown>>) => {
    const room = store.get(socket.data.roomCode ?? '');
    if (!room || room.phase !== 'lobby') return ack({ ok: false, error: 'Not in a lobby' });
    const parsed = readySchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: 'Invalid request' });

    const seat = findSeat(room, socket.data.playerId);
    if (!seat) return ack({ ok: false, error: 'Not seated in this room' });
    seat.ready = parsed.data.ready;
    store.touch(room);

    ack({ ok: true });
    broadcastRoomState(io, room);
  });

  socket.on('game:start', (payload: unknown, ack: AckFn<Record<string, unknown>>) => {
    const room = store.get(socket.data.roomCode ?? '');
    if (!room || room.phase !== 'lobby') return ack({ ok: false, error: 'Not in a lobby' });
    if (room.hostPlayerId !== socket.data.playerId) return ack({ ok: false, error: 'Only the host can start' });
    const parsed = startSchema.safeParse(payload ?? {});
    if (!parsed.success) return ack({ ok: false, error: 'Invalid request' });
    if (room.seats.some((s) => s.playerId === null)) return ack({ ok: false, error: 'Room is not full' });
    if (room.seats.some((s) => !s.ready)) return ack({ ok: false, error: 'Not everyone is ready' });

    const seed = nanoid();
    try {
      room.game = createGame(
        room.seats.map((s) => ({ id: s.playerId!, name: s.name! })),
        room.teamCount,
        seed,
      );
    } catch (err) {
      return ack({ ok: false, error: (err as Error).message });
    }
    room.phase = 'in-game';
    room.timerRng = seedFromString(`${seed}:timer`);
    store.touch(room);

    ack({ ok: true });
    broadcastGameViews(io, room);
    scheduleTurnTimer(io, store, room);
  });

  socket.on('disconnect', () => {
    const room = store.get(socket.data.roomCode ?? '');
    if (!room) return;
    const seat = findSeat(room, socket.data.playerId);
    if (!seat || seat.socketId !== socket.id) return;
    seat.connected = false;
    seat.socketId = null;
    store.touch(room);
    if (room.phase === 'lobby') broadcastRoomState(io, room);
  });
}
