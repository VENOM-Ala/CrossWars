import { customAlphabet } from 'nanoid';
import { teamOptionsFor } from '@rps/engine';
import type { Room, Seat } from './types';

// Excludes 0/O and 1/I/L so codes read back unambiguously over voice/chat.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generateCode = customAlphabet(CODE_ALPHABET, 4);

export interface Session {
  code: string;
  playerId: string;
}

export class RoomStore {
  private rooms = new Map<string, Room>();
  private sessions = new Map<string, Session>();
  private sessionsByRoom = new Map<string, Set<string>>();

  private freshCode(): string {
    let code: string;
    do {
      code = generateCode();
    } while (this.rooms.has(code));
    return code;
  }

  create(playerCount: number, teamCount: number | undefined): Room {
    const options = teamOptionsFor(playerCount);
    if (options.length === 0) {
      throw new Error(`Unsupported player count: ${playerCount}`);
    }
    const resolved = options.length === 1 ? options[0] : teamCount;
    if (!resolved || !options.includes(resolved as 2 | 3)) {
      throw new Error(`Choose a team count for ${playerCount} players: ${options.join(' or ')}`);
    }

    const code = this.freshCode();
    const seats: Seat[] = Array.from({ length: playerCount }, (_, seat) => ({
      seat,
      playerId: null,
      name: null,
      ready: false,
      connected: false,
      socketId: null,
      sessionToken: null,
    }));

    const room: Room = {
      code,
      hostPlayerId: null,
      playerCount,
      teamCount: resolved as 2 | 3,
      seats,
      phase: 'lobby',
      game: null,
      timerRng: 0,
      turnDeadline: null,
      turnTimeout: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.trim().toUpperCase());
  }

  touch(room: Room): void {
    room.lastActivityAt = Date.now();
  }

  remove(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    if (room.turnTimeout) clearTimeout(room.turnTimeout);
    for (const token of this.sessionsByRoom.get(code) ?? []) {
      this.sessions.delete(token);
    }
    this.sessionsByRoom.delete(code);
    this.rooms.delete(code);
  }

  registerSession(token: string, code: string, playerId: string): void {
    this.sessions.set(token, { code, playerId });
    let tokens = this.sessionsByRoom.get(code);
    if (!tokens) {
      tokens = new Set();
      this.sessionsByRoom.set(code, tokens);
    }
    tokens.add(token);
  }

  resolveSession(token: string): Session | undefined {
    return this.sessions.get(token);
  }

  dropSession(token: string): void {
    const session = this.sessions.get(token);
    if (session) this.sessionsByRoom.get(session.code)?.delete(token);
    this.sessions.delete(token);
  }

  all(): Room[] {
    return [...this.rooms.values()];
  }

  idleRooms(maxIdleMs: number): Room[] {
    const cutoff = Date.now() - maxIdleMs;
    return this.all().filter((r) => r.lastActivityAt < cutoff);
  }

  get size(): number {
    return this.rooms.size;
  }
}
