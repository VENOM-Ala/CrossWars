import http from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { RoomStore } from '../src/rooms/store';
import { registerSocketHandlers } from '../src/socket/index';

let httpServer: http.Server;
let io: Server;
let port: number;
const sockets: ClientSocket[] = [];

function connect(): Promise<ClientSocket> {
  return new Promise((resolve) => {
    const socket = ioClient(`http://localhost:${port}`, { transports: ['websocket'] });
    sockets.push(socket);
    socket.on('connect', () => resolve(socket));
  });
}

function emit<T>(socket: ClientSocket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => {
    socket.timeout(2000).emit(event, payload, (err: Error | null, res: T) => {
      resolve(err ? ({ ok: false, error: 'ack timed out' } as unknown as T) : res);
    });
  });
}

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve as (v: T) => void));
}

beforeEach(() => {
  return new Promise<void>((resolve) => {
    const store = new RoomStore();
    httpServer = http.createServer();
    io = new Server(httpServer, { cors: { origin: '*' } });
    registerSocketHandlers(io, store);
    httpServer.listen(0, () => {
      port = (httpServer.address() as { port: number }).port;
      resolve();
    });
  });
});

afterEach(() => {
  for (const s of sockets.splice(0)) s.close();
  io.close();
  httpServer.close();
});

describe('room full', () => {
  it('rejects a join once every seat is taken', async () => {
    const a = await connect();
    const b = await connect();
    const c = await connect();

    const created = await emit<any>(a, 'room:create', { playerCount: 2, name: 'Alice' });
    expect(created.ok).toBe(true);
    const joined = await emit<any>(b, 'room:join', { code: created.code, name: 'Bob' });
    expect(joined.ok).toBe(true);

    const rejected = await emit<any>(c, 'room:join', { code: created.code, name: 'Carl' });
    expect(rejected.ok).toBe(false);
    expect(rejected.error).toMatch(/full/i);
  });
});

describe('host migration', () => {
  it('promotes another connected seat to host when the host disconnects', async () => {
    const a = await connect();
    const b = await connect();

    const created = await emit<any>(a, 'room:create', { playerCount: 2, name: 'Alice' });
    const joined = await emit<any>(b, 'room:join', { code: created.code, name: 'Bob' });

    const roomStatePromise = waitFor<any>(b, 'room:state');
    a.close();
    const state = await roomStatePromise;

    expect(state.hostPlayerId).toBe(joined.playerId);
  });

  it('reclaims host on reconnect when nobody else is left to inherit it', async () => {
    const a = await connect();
    const created = await emit<any>(a, 'room:create', { playerCount: 2, name: 'Alice' });
    a.close();
    // Give the server a moment to process the disconnect (host -> null, sole seat).
    await new Promise((r) => setTimeout(r, 100));

    const a2 = await connect();
    const roomStatePromise = waitFor<any>(a2, 'room:state');
    const reconnected = await emit<any>(a2, 'room:reconnect', { token: created.token });
    expect(reconnected.ok).toBe(true);

    const state = await roomStatePromise;
    expect(state.hostPlayerId).toBe(created.playerId);
  });
});

describe('reconnect', () => {
  it('restores lobby state to a reconnecting session', async () => {
    const a = await connect();
    const created = await emit<any>(a, 'room:create', { playerCount: 2, name: 'Alice' });
    a.close();

    const a2 = await connect();
    const roomStatePromise = waitFor<any>(a2, 'room:state');
    const reconnected = await emit<any>(a2, 'room:reconnect', { token: created.token });
    expect(reconnected.ok).toBe(true);
    expect(reconnected.phase).toBe('lobby');

    const state = await roomStatePromise;
    expect(state.code).toBe(created.code);
  });

  it('restores an in-progress game to a reconnecting session, including host/room info', async () => {
    const a = await connect();
    const b = await connect();
    const created = await emit<any>(a, 'room:create', { playerCount: 2, name: 'Alice' });
    const joined = await emit<any>(b, 'room:join', { code: created.code, name: 'Bob' });
    await emit<any>(a, 'player:ready', { ready: true });
    await emit<any>(b, 'player:ready', { ready: true });
    const started = await emit<any>(a, 'game:start', {});
    expect(started.ok).toBe(true);

    a.close();

    const a2 = await connect();
    const gameViewPromise = waitFor<any>(a2, 'game:view');
    const reconnected = await emit<any>(a2, 'room:reconnect', { token: created.token });
    expect(reconnected.ok).toBe(true);
    expect(reconnected.phase).toBe('in-game');

    const payload = await gameViewPromise;
    expect(payload.view.you.id).toBe(created.playerId);
    expect(payload.roomCode).toBe(created.code);
    // Alice (the host) just disconnected, so host migrated to the still-connected Bob.
    expect(payload.hostPlayerId).toBe(joined.playerId);
  });
});

describe('double-submit', () => {
  it('safely rejects a second game:start once the game is already running', async () => {
    const a = await connect();
    const b = await connect();
    const created = await emit<any>(a, 'room:create', { playerCount: 2, name: 'Alice' });
    await emit<any>(b, 'room:join', { code: created.code, name: 'Bob' });
    await emit<any>(a, 'player:ready', { ready: true });
    await emit<any>(b, 'player:ready', { ready: true });

    const [first, second] = await Promise.all([
      emit<any>(a, 'game:start', {}),
      emit<any>(a, 'game:start', {}),
    ]);

    const results = [first, second];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
  });
});
