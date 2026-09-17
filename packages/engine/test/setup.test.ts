import { describe, expect, it } from 'vitest';
import { buildDeck, makeConfig, standardCopies, teamForSeat, supportedPlayerCounts } from '../src/setup';
import { createGame } from '../src/game';
import { game, seats } from './helpers';

describe('player count table', () => {
  it('supports exactly the documented counts', () => {
    expect(supportedPlayerCounts()).toEqual([2, 3, 4, 6, 8, 9, 10, 12]);
  });

  it.each([5, 7, 11, 1, 13])('rejects %i players', (n) => {
    expect(() => makeConfig(n, 2)).toThrow(/Unsupported player count/);
  });

  it.each([
    [2, 2, 4, 1],
    [3, 3, 4, 1],
    [4, 2, 4, 1],
    [6, 2, 6, 1],
    [6, 3, 6, 1],
    [8, 2, 6, 1],
    [9, 3, 6, 2],
    [10, 2, 8, 2],
    [12, 2, 8, 2],
    [12, 3, 8, 2],
  ])('%i players / %i teams uses a %ix%i board and %i rows to win', (p, t, size, rows) => {
    const cfg = makeConfig(p, t as 2 | 3);
    expect(cfg.size).toBe(size);
    expect(cfg.rowsToWin).toBe(rows);
  });

  it('rejects 8 players with 3 teams', () => {
    expect(() => makeConfig(8, 3)).toThrow(/cannot be played with 3 teams/);
  });

  it('rejects 3 players with 2 teams', () => {
    expect(() => makeConfig(3, 2)).toThrow(/cannot be played with 2 teams/);
  });
});

describe('deck composition', () => {
  it('uses 10 standard copies up to 6 players and 20 above', () => {
    expect(standardCopies(6)).toBe(10);
    expect(standardCopies(8)).toBe(20);
  });

  it('builds 30 standard + 3 wild + 2 trash per player for a 2-player game', () => {
    const deck = buildDeck('red', 2, 1);
    const count = (k: string) => deck.filter((c) => c.kind === k).length;
    expect(count('rock')).toBe(10);
    expect(count('paper')).toBe(10);
    expect(count('scissors')).toBe(10);
    expect(count('wild')).toBe(3);
    expect(count('trash')).toBe(2);
    expect(deck).toHaveLength(35);
  });

  it('scales wilds and trash with players on that team', () => {
    const deck = buildDeck('blue', 10, 5);
    expect(deck.filter((c) => c.kind === 'wild')).toHaveLength(15);
    expect(deck.filter((c) => c.kind === 'trash')).toHaveLength(10);
    expect(deck.filter((c) => c.kind === 'rock')).toHaveLength(20);
  });

  it('gives every card a unique id', () => {
    const deck = buildDeck('green', 12, 4);
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
  });
});

describe('seating', () => {
  it('alternates teams strictly in seat order', () => {
    expect([0, 1, 2, 3].map((s) => teamForSeat(s, 2))).toEqual(['red', 'blue', 'red', 'blue']);
    expect([0, 1, 2, 3].map((s) => teamForSeat(s, 3))).toEqual(['red', 'blue', 'green', 'red']);
  });

  it('deals 3 cards to each player from their own team pile', () => {
    const state = game(4, 2);
    for (const p of state.players) {
      expect(p.hand).toHaveLength(3);
      expect(p.hand.every((c) => c.team === p.team)).toBe(true);
    }
    // red has 2 players: 30 standard + 6 wild + 4 trash = 40, minus 6 dealt
    expect(state.teams.red!.drawPile).toHaveLength(34);
  });

  it('is reproducible from a seed', () => {
    const a = createGame(seats(4), 2, 'seed-a');
    const b = createGame(seats(4), 2, 'seed-a');
    const c = createGame(seats(4), 2, 'seed-b');
    expect(a.players.map((p) => p.hand.map((h) => h.id))).toEqual(
      b.players.map((p) => p.hand.map((h) => h.id)),
    );
    expect(a.players.map((p) => p.hand.map((h) => h.id))).not.toEqual(
      c.players.map((p) => p.hand.map((h) => h.id)),
    );
  });
});
