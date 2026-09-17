import { describe, expect, it } from 'vitest';
import { RoomStore } from '../src/rooms/store';

describe('RoomStore', () => {
  it('creates a room with a 4-character code and empty seats', () => {
    const store = new RoomStore();
    const room = store.create(4, undefined);
    expect(room.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(room.seats).toHaveLength(4);
    expect(room.seats.every((s) => s.playerId === null)).toBe(true);
    expect(room.phase).toBe('lobby');
  });

  it('resolves the team count automatically when only one option exists', () => {
    const store = new RoomStore();
    const room = store.create(4, undefined);
    expect(room.teamCount).toBe(2);
  });

  it('requires an explicit team count when more than one is valid', () => {
    const store = new RoomStore();
    expect(() => store.create(6, undefined)).toThrow(/choose a team count/i);
    const room = store.create(6, 3);
    expect(room.teamCount).toBe(3);
  });

  it('rejects unsupported player counts', () => {
    const store = new RoomStore();
    expect(() => store.create(5, undefined)).toThrow(/unsupported/i);
  });

  it('never issues two rooms with the same code', () => {
    const store = new RoomStore();
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(store.create(2, undefined).code);
    }
    expect(codes.size).toBe(50);
  });

  it('looks rooms up case-insensitively', () => {
    const store = new RoomStore();
    const room = store.create(2, undefined);
    expect(store.get(room.code.toLowerCase())).toBe(room);
  });

  it('round-trips sessions and drops them with the room', () => {
    const store = new RoomStore();
    const room = store.create(2, undefined);
    store.registerSession('tok1', room.code, 'player-1');
    expect(store.resolveSession('tok1')).toEqual({ code: room.code, playerId: 'player-1' });

    store.remove(room.code);
    expect(store.get(room.code)).toBeUndefined();
    expect(store.resolveSession('tok1')).toBeUndefined();
  });

  it('flags rooms idle past the given threshold', () => {
    const store = new RoomStore();
    const room = store.create(2, undefined);
    room.lastActivityAt = Date.now() - 1000;
    expect(store.idleRooms(500)).toContain(room);
    expect(store.idleRooms(5000)).not.toContain(room);
  });
});
