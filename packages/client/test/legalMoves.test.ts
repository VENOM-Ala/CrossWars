import { describe, expect, it } from 'vitest';
import { createGame, viewFor } from '@rps/engine';
import { legalMovesFor } from '../src/game/legalMoves';

describe('legalMovesFor', () => {
  it('returns nothing when it is not your turn', () => {
    const state = createGame(
      [
        { id: 'a', name: 'Ada' },
        { id: 'b', name: 'Bob' },
      ],
      2,
      'seed',
    );
    const view = viewFor(state, 'b'); // seat 1 never opens
    expect(legalMovesFor(view)).toEqual([]);
  });

  it('matches getLegalMoves for the player on turn on an empty board', () => {
    const state = createGame(
      [
        { id: 'a', name: 'Ada' },
        { id: 'b', name: 'Bob' },
      ],
      2,
      'seed',
    );
    const view = viewFor(state, 'a');
    const moves = legalMovesFor(view);
    // Every non-trash card in hand may start any of the 36 empty spaces on a 6x6 board.
    const nonTrash = view.you.hand.filter((c) => c.kind !== 'trash').length;
    expect(moves.length).toBe(nonTrash * 36);
  });
});
