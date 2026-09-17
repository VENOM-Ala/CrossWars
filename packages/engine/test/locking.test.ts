import { describe, expect, it } from 'vitest';
import { applyMove } from '../src/game';
import { card, game, setHand, setSpace } from './helpers';

function play(state = game(), c = card('red', 'rock'), row = 0, col = 0) {
  setHand(state, [c]);
  return applyMove(state, 'p0', { type: 'play', cardId: c.id, row, col });
}

describe('lock conditions', () => {
  it('does not lock a fresh single card', () => {
    const s = play();
    expect(s.board[0][0].locked).toBe(false);
  });

  it('locks when a third card lands on the stack', () => {
    const s = game();
    setSpace(s, 0, 0, [card('blue', 'rock'), card('green', 'paper')]);
    const next = play(s, card('red', 'scissors'));
    expect(next.board[0][0].cards).toHaveLength(3);
    expect(next.board[0][0].locked).toBe(true);
  });

  it('locks when a card lands on your own team colour', () => {
    const s = game();
    setSpace(s, 0, 0, [card('red', 'rock')]);
    const next = play(s, card('red', 'paper'));
    expect(next.board[0][0].cards).toHaveLength(2);
    expect(next.board[0][0].locked).toBe(true);
  });

  it('does not lock a second card of a different colour', () => {
    const s = game();
    setSpace(s, 0, 0, [card('blue', 'rock')]);
    const next = play(s, card('red', 'paper'));
    expect(next.board[0][0].locked).toBe(false);
  });

  it('locks whenever a wild is played, even onto an empty space', () => {
    const s = play(game(), card('red', 'wild'));
    expect(s.board[0][0].cards).toHaveLength(1);
    expect(s.board[0][0].locked).toBe(true);
  });

  it('locks when a wild covers an opponent card', () => {
    const s = game();
    setSpace(s, 1, 1, [card('blue', 'scissors')]);
    const next = play(s, card('red', 'wild'), 1, 1);
    expect(next.board[1][1].locked).toBe(true);
  });

  it('keeps the top card visible when locked', () => {
    const wild = card('red', 'wild');
    const s = play(game(), wild);
    const top = s.board[0][0].cards.at(-1)!;
    expect(top.id).toBe(wild.id);
    expect(top.kind).toBe('wild');
  });

  it('never stacks more than three cards', () => {
    const s = game();
    setSpace(s, 2, 2, [card('blue', 'rock'), card('green', 'paper'), card('blue', 'scissors')], true);
    expect(() => play(s, card('red', 'rock'), 2, 2)).toThrow();
  });
});
