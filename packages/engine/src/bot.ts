import { GameState, Move } from './types';
import { nextFloat } from './rng';
import { applyMove, currentPlayer, getLegalMoves } from './game';

export interface SimResult {
  state: GameState;
  turns: number;
  terminated: boolean;
}

/** Picks a uniformly random legal move, or reshuffles if there are none. */
export function randomMove(state: GameState, rng: number): [Move, number] {
  const player = currentPlayer(state)!;
  const moves = getLegalMoves(state, player.id);
  if (moves.length === 0) return [{ type: 'reshuffle' }, rng];
  const [f, next] = nextFloat(rng);
  const pick = moves[Math.floor(f * moves.length)];
  return [{ type: 'play', cardId: pick.cardId, row: pick.row, col: pick.col }, next];
}

/** Plays a whole game out with random moves. Used to verify games terminate. */
export function simulate(initial: GameState, rngSeed: number, maxTurns = 5000): SimResult {
  let state = initial;
  let rng = rngSeed;
  let turns = 0;
  while (!state.winner && !state.endedBy && turns < maxTurns) {
    const player = currentPlayer(state)!;
    const [move, next] = randomMove(state, rng);
    rng = next;
    state = applyMove(state, player.id, move);
    turns++;
  }
  return { state, turns, terminated: Boolean(state.winner || state.endedBy) };
}
