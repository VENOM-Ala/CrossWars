import { describe, expect, it } from 'vitest';
import { createRoomSchema, joinRoomSchema, moveSchema, pickSeatSchema, readySchema } from '../src/schemas';

describe('createRoomSchema', () => {
  it('accepts a valid payload', () => {
    expect(createRoomSchema.safeParse({ playerCount: 4, name: 'Ada' }).success).toBe(true);
  });

  it('rejects a blank name', () => {
    expect(createRoomSchema.safeParse({ playerCount: 4, name: '' }).success).toBe(false);
  });

  it('rejects a non-integer player count', () => {
    expect(createRoomSchema.safeParse({ playerCount: 4.5, name: 'Ada' }).success).toBe(false);
  });

  it('rejects a team count outside {2, 3}', () => {
    expect(createRoomSchema.safeParse({ playerCount: 6, teamCount: 4, name: 'Ada' }).success).toBe(false);
  });
});

describe('joinRoomSchema', () => {
  it('rejects a code shorter than 4 characters', () => {
    expect(joinRoomSchema.safeParse({ code: 'AB', name: 'Ada' }).success).toBe(false);
  });
});

describe('pickSeatSchema / readySchema', () => {
  it('rejects a negative seat index', () => {
    expect(pickSeatSchema.safeParse({ seat: -1 }).success).toBe(false);
  });

  it('requires a boolean ready flag', () => {
    expect(readySchema.safeParse({ ready: 'yes' }).success).toBe(false);
    expect(readySchema.safeParse({ ready: true }).success).toBe(true);
  });
});

describe('moveSchema', () => {
  it('accepts a play move', () => {
    expect(moveSchema.safeParse({ type: 'play', cardId: 'red-rock-0', row: 0, col: 1 }).success).toBe(true);
  });

  it('accepts a reshuffle move', () => {
    expect(moveSchema.safeParse({ type: 'reshuffle' }).success).toBe(true);
  });

  it('rejects an unknown move type', () => {
    expect(moveSchema.safeParse({ type: 'pass' }).success).toBe(false);
  });

  it('rejects a play move missing coordinates', () => {
    expect(moveSchema.safeParse({ type: 'play', cardId: 'red-rock-0' }).success).toBe(false);
  });
});
