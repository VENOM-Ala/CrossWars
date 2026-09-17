import { createGame, SeatInput } from '../src/game';
import { Card, CardKind, GameState, Team } from '../src/types';

export function seats(n: number): SeatInput[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
}

export function game(playerCount = 2, teamCount: 2 | 3 = 2, seed = 'test-seed'): GameState {
  return createGame(seats(playerCount), teamCount, seed);
}

let uid = 0;
export function card(team: Team, kind: CardKind): Card {
  return { id: `fixture-${team}-${kind}-${uid++}`, team, kind };
}

/** Replaces the current player's hand with exactly these cards. */
export function setHand(state: GameState, cards: Card[]): GameState {
  state.players[state.turnIndex].hand = cards;
  return state;
}

/** Puts a literal stack of cards onto a space. */
export function setSpace(
  state: GameState,
  row: number,
  col: number,
  cards: Card[],
  locked = false,
): GameState {
  state.board[row][col] = { cards, locked };
  return state;
}

/** Forces whose turn it is by seat index. */
export function setTurn(state: GameState, seat: number): GameState {
  state.turnIndex = seat;
  return state;
}

/** Fills a line of spaces with single top cards of a team. */
export function fillLine(
  state: GameState,
  cells: Array<[number, number]>,
  team: Team,
  kind: CardKind = 'rock',
): GameState {
  for (const [r, c] of cells) setSpace(state, r, c, [card(team, kind)]);
  return state;
}
