import { describe, expect, it } from 'vitest';
import { applyMove, getLegalMoves, IllegalMoveError } from '../src/game';
import { card, game, setHand, setSpace } from './helpers';

describe('turn flow', () => {
  it('refills the hand to three and passes to the next seat', () => {
    const s = game(4, 2);
    const c = s.players[0].hand[0];
    const next = applyMove(s, 'p0', { type: 'play', cardId: c.id, row: 0, col: 0 });
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.players[0].hand.map((h) => h.id)).not.toContain(c.id);
    expect(next.turnIndex).toBe(1);
  });

  it('wraps around the table', () => {
    let s = game(3, 3);
    for (let i = 0; i < 3; i++) {
      const p = s.players[s.turnIndex];
      const m = getLegalMoves(s, p.id)[0];
      s = applyMove(s, p.id, { type: 'play', cardId: m.cardId, row: m.row, col: m.col });
    }
    expect(s.turnIndex).toBe(0);
  });

  it('draws nothing once the pile is empty but keeps playing from hand', () => {
    let s = game(2, 2);
    s.teams.red!.drawPile = [];
    const c = s.players[0].hand[0];
    s = applyMove(s, 'p0', { type: 'play', cardId: c.id, row: 0, col: 0 });
    expect(s.players[0].hand).toHaveLength(2);
  });
});

describe('no legal move', () => {
  /** Board where every space is locked, so nothing except a bomb is playable. */
  function lockedBoard() {
    const s = game(2, 2);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) setSpace(s, r, c, [card('red', 'rock')], true);
    }
    return s;
  }

  it('is rejected while a legal move exists', () => {
    const s = game();
    expect(() => applyMove(s, 'p0', { type: 'reshuffle' })).toThrow(/legal move available/);
  });

  it('returns the hand, reshuffles and draws a new hand', () => {
    const s = lockedBoard();
    const oldHand = [card('red', 'rock'), card('red', 'paper'), card('red', 'scissors')];
    setHand(s, oldHand);
    s.teams.red!.drawPile = [card('red', 'trash'), card('red', 'rock'), card('red', 'paper')];
    // every space holds a red card, so red's own bomb is useless: still stuck
    const next = applyMove(s, 'p0', { type: 'reshuffle' });
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.teams.red!.drawPile.length + 3).toBe(6);
    expect(next.log.some((e) => e.type === 'reshuffle')).toBe(true);
  });

  it('lets the player play after reshuffling when a move opens up', () => {
    const s = game(2, 2);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) setSpace(s, r, c, [card('blue', 'rock')], true);
    }
    setHand(s, [card('red', 'rock'), card('red', 'paper'), card('red', 'scissors')]);
    s.teams.red!.drawPile = [card('red', 'trash'), card('red', 'trash'), card('red', 'rock')];
    const next = applyMove(s, 'p0', { type: 'reshuffle' });
    expect(next.turnPhase).toBe('mustPlay');
    expect(next.turnIndex).toBe(0); // still your turn
    expect(getLegalMoves(next, 'p0').length).toBeGreaterThan(0);
  });

  it('refuses a second reshuffle in the same turn', () => {
    const s = game(2, 2);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) setSpace(s, r, c, [card('blue', 'rock')], true);
    }
    setHand(s, [card('red', 'rock')]);
    s.teams.red!.drawPile = [card('red', 'trash')];
    const next = applyMove(s, 'p0', { type: 'reshuffle' });
    expect(() => applyMove(next, 'p0', { type: 'reshuffle' })).toThrow(IllegalMoveError);
  });

  it('passes the turn when a fresh hand is still unplayable', () => {
    const s = lockedBoard();
    setHand(s, [card('red', 'rock')]);
    s.teams.red!.drawPile = [card('red', 'paper')];
    const next = applyMove(s, 'p0', { type: 'reshuffle' });
    expect(next.turnIndex).toBe(1);
  });
});

describe('running out of cards', () => {
  it('skips a player with no hand and no pile', () => {
    let s = game(4, 2);
    s.players[1].hand = [];
    s.teams.blue!.drawPile = [];
    s.players[3].hand = [];
    const c = s.players[0].hand[0];
    s = applyMove(s, 'p0', { type: 'play', cardId: c.id, row: 0, col: 0 });
    expect(s.turnIndex).toBe(2); // p1 and p3 are both out, so p2 is next
    expect(s.log.some((e) => e.type === 'skip')).toBe(true);
  });

  it('ends in a draw when nobody has cards left', () => {
    let s = game(2, 2);
    for (const p of s.players) p.hand = [];
    s.teams.red!.drawPile = [];
    s.teams.blue!.drawPile = [];
    s.players[0].hand = [card('red', 'rock')];
    s = applyMove(s, 'p0', { type: 'play', cardId: s.players[0].hand[0].id, row: 0, col: 0 });
    expect(s.endedBy).toBe('draw');
    expect(s.winner).toBeNull();
  });

  it('rejects any move once the game is over', () => {
    let s = game(2, 2);
    for (const p of s.players) p.hand = [];
    s.teams.red!.drawPile = [];
    s.teams.blue!.drawPile = [];
    s.players[0].hand = [card('red', 'rock')];
    s = applyMove(s, 'p0', { type: 'play', cardId: s.players[0].hand[0].id, row: 0, col: 0 });
    expect(() => applyMove(s, 'p0', { type: 'reshuffle' })).toThrow(/Game is over/);
  });
});
