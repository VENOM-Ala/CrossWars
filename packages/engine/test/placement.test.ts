import { describe, expect, it } from 'vitest';
import { applyMove, canPlace, getLegalMoves, IllegalMoveError } from '../src/game';
import { card, game, setHand, setSpace } from './helpers';

describe('placing on an empty space', () => {
  it.each(['rock', 'paper', 'scissors', 'wild'] as const)('allows %s', (kind) => {
    const s = game();
    expect(canPlace(s, card('red', kind), 0, 0)).toBe(true);
  });

  it('rejects trash on an empty space', () => {
    const s = game();
    expect(canPlace(s, card('red', 'trash'), 0, 0)).toBe(false);
  });
});

describe('roshambo stacking', () => {
  const beats: Array<[string, string]> = [
    ['scissors', 'paper'],
    ['paper', 'rock'],
    ['rock', 'scissors'],
  ];

  it.each(beats)('%s may be placed on %s', (winner, loser) => {
    const s = game();
    setSpace(s, 1, 1, [card('blue', loser as any)]);
    expect(canPlace(s, card('red', winner as any), 1, 1)).toBe(true);
  });

  it.each(beats)('%s may not be placed on itself', (kind) => {
    const s = game();
    setSpace(s, 1, 1, [card('blue', kind as any)]);
    // same kind, different team -> not a valid counter
    expect(canPlace(s, card('red', kind as any), 1, 1)).toBe(false);
  });

  it.each(beats)('%s may not be placed on the card it loses to', (winner, loser) => {
    const s = game();
    setSpace(s, 1, 1, [card('blue', winner as any)]);
    expect(canPlace(s, card('red', loser as any), 1, 1)).toBe(false);
  });
});

describe('wild cards', () => {
  it.each(['rock', 'paper', 'scissors'] as const)('may be placed on %s', (kind) => {
    const s = game();
    setSpace(s, 2, 2, [card('blue', kind)]);
    expect(canPlace(s, card('red', 'wild'), 2, 2)).toBe(true);
  });

  it('may never be placed on another wild', () => {
    const s = game();
    // a wild always locks its space, but check the rule independently of locking
    setSpace(s, 2, 2, [card('blue', 'wild')], false);
    expect(canPlace(s, card('red', 'wild'), 2, 2)).toBe(false);
  });
});

describe('locked spaces', () => {
  it('reject every non-trash card', () => {
    const s = game();
    setSpace(s, 0, 1, [card('blue', 'rock')], true);
    for (const kind of ['rock', 'paper', 'scissors', 'wild'] as const) {
      expect(canPlace(s, card('red', kind), 0, 1)).toBe(false);
    }
  });

  it('can still be bombed by the opposing team', () => {
    const s = game();
    setSpace(s, 0, 1, [card('blue', 'rock')], true);
    expect(canPlace(s, card('red', 'trash'), 0, 1)).toBe(true);
  });
});

describe('trash (bomb)', () => {
  it('cannot target your own team', () => {
    const s = game();
    setSpace(s, 0, 0, [card('red', 'rock')]);
    expect(canPlace(s, card('red', 'trash'), 0, 0)).toBe(false);
  });

  it('targets a stack by its top card, not the cards underneath', () => {
    const s = game();
    setSpace(s, 0, 0, [card('red', 'rock'), card('blue', 'paper')]);
    expect(canPlace(s, card('red', 'trash'), 0, 0)).toBe(true);
    setSpace(s, 0, 1, [card('blue', 'rock'), card('red', 'paper')]);
    expect(canPlace(s, card('red', 'trash'), 0, 1)).toBe(false);
  });

  it('empties the space, unlocks it, and removes every card from the game', () => {
    let s = game();
    const bomb = card('red', 'trash');
    setHand(s, [bomb]);
    setSpace(s, 1, 2, [card('blue', 'rock'), card('red', 'paper'), card('blue', 'scissors')], true);
    s = applyMove(s, 'p0', { type: 'play', cardId: bomb.id, row: 1, col: 2 });
    expect(s.board[1][2].cards).toHaveLength(0);
    expect(s.board[1][2].locked).toBe(false);
    expect(s.teams.blue!.removed).toHaveLength(2);
    expect(s.teams.red!.removed).toHaveLength(2); // the paper plus the bomb itself
  });
});

describe('move validation', () => {
  it('rejects a card that is not in hand', () => {
    const s = game();
    expect(() => applyMove(s, 'p0', { type: 'play', cardId: 'nope', row: 0, col: 0 })).toThrow(
      IllegalMoveError,
    );
  });

  it('rejects a move from a player whose turn it is not', () => {
    const s = game();
    const c = s.players[1].hand[0];
    expect(() => applyMove(s, 'p1', { type: 'play', cardId: c.id, row: 0, col: 0 })).toThrow(
      /Not your turn/,
    );
  });

  it('rejects out-of-bounds coordinates', () => {
    const s = game();
    const c = s.players[0].hand[0];
    expect(canPlace(s, c, 9, 9)).toBe(false);
    expect(() => applyMove(s, 'p0', { type: 'play', cardId: c.id, row: 9, col: 9 })).toThrow(
      IllegalMoveError,
    );
  });

  it('lists a legal move for every (card, space) pair it allows', () => {
    const s = game();
    setHand(s, [card('red', 'rock')]);
    // 6x6 empty board -> 36 legal placements for a single card
    expect(getLegalMoves(s, 'p0')).toHaveLength(36);
  });
});
