import { describe, expect, it } from 'vitest';
import { checkWin, countLines, findLines } from '../src/win';
import { applyMove } from '../src/game';
import { card, fillLine, game, setHand, setSpace } from './helpers';

describe('line detection', () => {
  it('finds a horizontal row', () => {
    const s = game();
    fillLine(s, [[1, 0], [1, 1], [1, 2], [1, 3]], 'red');
    expect(checkWin(s.board, 1)).toBe('red');
  });

  it('finds a vertical row', () => {
    const s = game();
    fillLine(s, [[0, 2], [1, 2], [2, 2], [3, 2]], 'blue');
    expect(checkWin(s.board, 1)).toBe('blue');
  });

  it('finds both diagonals', () => {
    const down = game();
    fillLine(down, [[0, 0], [1, 1], [2, 2], [3, 3]], 'red');
    expect(checkWin(down.board, 1)).toBe('red');

    const up = game();
    fillLine(up, [[0, 3], [1, 2], [2, 1], [3, 0]], 'blue');
    expect(checkWin(up.board, 1)).toBe('blue');
  });

  it('ignores a line of mixed teams', () => {
    const s = game();
    fillLine(s, [[0, 0], [0, 1], [0, 2]], 'red');
    fillLine(s, [[0, 3]], 'blue');
    expect(checkWin(s.board, 1)).toBeNull();
  });

  it('ignores a line broken by an empty space', () => {
    const s = game();
    fillLine(s, [[0, 0], [0, 1], [0, 3]], 'red');
    expect(checkWin(s.board, 1)).toBeNull();
  });

  it('counts only the top card of a stack', () => {
    const s = game();
    fillLine(s, [[0, 0], [0, 1], [0, 2]], 'red');
    setSpace(s, 0, 3, [card('red', 'rock'), card('blue', 'paper')]);
    expect(checkWin(s.board, 1)).toBeNull();
    setSpace(s, 0, 3, [card('blue', 'rock'), card('red', 'paper')]);
    expect(checkWin(s.board, 1)).toBe('red');
  });

  it('counts locked spaces for the team that locked them', () => {
    const s = game();
    fillLine(s, [[2, 0], [2, 1], [2, 2]], 'red');
    setSpace(s, 2, 3, [card('blue', 'rock'), card('red', 'wild')], true);
    expect(checkWin(s.board, 1)).toBe('red');
  });

  it('counts wild cards as their team colour', () => {
    const s = game();
    for (const cell of [[0, 0], [0, 1], [0, 2], [0, 3]] as Array<[number, number]>) {
      setSpace(s, cell[0], cell[1], [card('red', 'wild')], true);
    }
    expect(checkWin(s.board, 1)).toBe('red');
  });
});

describe('board sizes and row targets', () => {
  it('needs a full line on a 4x4 board', () => {
    const s = game(2, 2);
    expect(s.config.size).toBe(4);
    fillLine(s, [[0, 0], [0, 1], [0, 2]], 'red');
    expect(checkWin(s.board, 1)).toBeNull();
    fillLine(s, [[0, 3]], 'red');
    expect(checkWin(s.board, 1)).toBe('red');
  });

  it('requires two rows for 9+ player games', () => {
    const s = game(9, 3);
    expect(s.config.rowsToWin).toBe(2);
    fillLine(s, [[0, 0], [0, 1], [0, 2], [0, 3]], 'red');
    expect(checkWin(s.board, 2)).toBeNull();
    fillLine(s, [[2, 0], [2, 1], [2, 2], [2, 3]], 'red');
    expect(checkWin(s.board, 2)).toBe('red');
  });

  it('allows the two winning rows to share a card', () => {
    const s = game(9, 3);
    // an L: one horizontal and one vertical row meeting at (0,0)
    fillLine(s, [[0, 0], [0, 1], [0, 2], [0, 3]], 'red');
    fillLine(s, [[1, 0], [2, 0], [3, 0]], 'red');
    expect(countLines(s.board, 'red')).toBe(2);
    expect(checkWin(s.board, 2)).toBe('red');
  });

  it('treats a line of five as two overlapping rows', () => {
    const s = game(9, 3);
    fillLine(s, [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], 'red');
    expect(countLines(s.board, 'red')).toBe(2);
  });

  it('does not find lines that run off the edge of the board', () => {
    const s = game(2, 2);
    fillLine(s, [[3, 1], [3, 2], [3, 3]], 'red');
    expect(findLines(s.board)).toHaveLength(0);
  });
});

describe('game ending', () => {
  it('ends immediately on the winning placement', () => {
    const s = game(2, 2);
    fillLine(s, [[0, 0], [0, 1], [0, 2]], 'red');
    const winner = card('red', 'rock');
    setHand(s, [winner]);
    const next = applyMove(s, 'p0', { type: 'play', cardId: winner.id, row: 0, col: 3 });
    expect(next.winner).toBe('red');
    expect(next.endedBy).toBe('rows');
    expect(next.log.at(-1)).toMatchObject({ type: 'end', reason: 'rows', winner: 'red' });
  });

  it('can be won by covering an opponent card', () => {
    const s = game(2, 2);
    fillLine(s, [[1, 0], [1, 1], [1, 2]], 'red');
    setSpace(s, 1, 3, [card('blue', 'paper')]);
    const winner = card('red', 'scissors');
    setHand(s, [winner]);
    const next = applyMove(s, 'p0', { type: 'play', cardId: winner.id, row: 1, col: 3 });
    expect(next.winner).toBe('red');
  });

  it('does not end when a bomb breaks up an opponent line', () => {
    const s = game(2, 2);
    fillLine(s, [[1, 0], [1, 1], [1, 2]], 'blue');
    const bomb = card('red', 'trash');
    setHand(s, [bomb]);
    const next = applyMove(s, 'p0', { type: 'play', cardId: bomb.id, row: 1, col: 1 });
    expect(next.winner).toBeNull();
    expect(next.board[1][1].cards).toHaveLength(0);
  });
});
