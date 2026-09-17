import { describe, expect, it } from 'vitest';
import { createGame } from '../src/game';
import { simulate } from '../src/bot';
import { seedFromString } from '../src/rng';
import { viewFor } from '../src/game';
import { seats } from './helpers';

const CONFIGS: Array<[number, 2 | 3]> = [
  [2, 2],
  [3, 3],
  [4, 2],
  [6, 2],
  [6, 3],
  [8, 2],
  [9, 3],
  [10, 2],
  [12, 3],
];

describe('random-play simulation', () => {
  it.each(CONFIGS)('%i players / %i teams always terminates', (players, teams) => {
    const results = [];
    for (let i = 0; i < 200; i++) {
      const state = createGame(seats(players), teams, `sim-${players}-${teams}-${i}`);
      const r = simulate(state, seedFromString(`rng-${i}`));
      expect(r.terminated).toBe(true);
      results.push(r);
    }
    const wins = results.filter((r) => r.state.winner).length;
    const avgTurns = results.reduce((a, r) => a + r.turns, 0) / results.length;
    // Surfaced in test output for balance tuning.
    console.log(
      `${players}p/${teams}t  decisive ${((wins / results.length) * 100).toFixed(0)}%  avg turns ${avgTurns.toFixed(1)}`,
    );
    expect(avgTurns).toBeGreaterThan(0);
  });

  it('never leaves a stack taller than three or a card in two places', () => {
    const state = createGame(seats(6), 3, 'integrity');
    const { state: end } = simulate(state, seedFromString('integrity'));
    const seen = new Set<string>();
    for (const row of end.board) {
      for (const space of row) {
        expect(space.cards.length).toBeLessThanOrEqual(3);
        for (const c of space.cards) {
          expect(seen.has(c.id)).toBe(false);
          seen.add(c.id);
        }
      }
    }
    for (const p of end.players) {
      for (const c of p.hand) {
        expect(seen.has(c.id)).toBe(false);
        seen.add(c.id);
      }
    }
    for (const ts of Object.values(end.teams)) {
      for (const c of [...ts!.drawPile, ...ts!.removed]) {
        expect(seen.has(c.id)).toBe(false);
        seen.add(c.id);
      }
    }
  });

  it('is fully reproducible from a seed', () => {
    const a = simulate(createGame(seats(4), 2, 'repro'), seedFromString('repro'));
    const b = simulate(createGame(seats(4), 2, 'repro'), seedFromString('repro'));
    expect(a.turns).toBe(b.turns);
    expect(a.state.winner).toBe(b.state.winner);
    expect(JSON.stringify(a.state.board)).toBe(JSON.stringify(b.state.board));
  });
});

describe('player views', () => {
  it('never exposes another hand or the draw pile contents', () => {
    const state = createGame(seats(4), 2, 'view');
    const view = viewFor(state, 'p0');
    const json = JSON.stringify(view);
    expect(view.you.hand).toHaveLength(3);
    expect(view.opponents).toHaveLength(3);
    expect(view.opponents.every((o) => (o as any).hand === undefined)).toBe(true);
    for (const opponent of state.players.slice(1)) {
      for (const c of opponent.hand) expect(json).not.toContain(c.id);
    }
    for (const c of state.teams.red!.drawPile) expect(json).not.toContain(c.id);
    expect(view.drawPileCounts.red).toBe(state.teams.red!.drawPile.length);
  });
});
