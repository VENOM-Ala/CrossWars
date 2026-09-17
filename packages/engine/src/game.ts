import {
  Board,
  Card,
  GameConfig,
  GameState,
  LegalPlay,
  Move,
  Player,
  PlayerView,
  Space,
  Team,
  TeamState,
} from './types';
import {
  HAND_SIZE,
  MAX_STACK,
  buildShuffledDeck,
  makeConfig,
  teamForSeat,
  teamsInPlay,
} from './setup';
import { seedFromString, shuffle } from './rng';
import { checkWin } from './win';

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

export interface SeatInput {
  id: string;
  name: string;
}

function emptyBoard(size: number): Board {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, (): Space => ({ cards: [], locked: false })),
  );
}

export function createGame(
  seats: SeatInput[],
  teamCount: 2 | 3,
  seed: string,
  configOverride?: GameConfig,
): GameState {
  const config = configOverride ?? makeConfig(seats.length, teamCount);
  if (seats.length !== config.playerCount) {
    throw new Error(`Expected ${config.playerCount} seats, got ${seats.length}`);
  }

  let rngState = seedFromString(seed);

  const players: Player[] = seats.map((s, seat) => ({
    id: s.id,
    name: s.name,
    seat,
    team: teamForSeat(seat, config.teamCount),
    hand: [],
  }));

  const teams: Partial<Record<Team, TeamState>> = {};
  for (const team of teamsInPlay(config.teamCount)) {
    const playersOnTeam = players.filter((p) => p.team === team).length;
    const [deck, next] = buildShuffledDeck(team, config.playerCount, playersOnTeam, rngState);
    rngState = next;
    teams[team] = { drawPile: deck, removed: [] };
  }

  // Deal in seat order so the deal is reproducible.
  for (const player of players) {
    const pile = teams[player.team]!.drawPile;
    player.hand = pile.splice(0, HAND_SIZE);
  }

  return {
    config,
    board: emptyBoard(config.size),
    players,
    teams,
    turnIndex: 0,
    turnPhase: 'normal',
    winner: null,
    endedBy: null,
    rngState,
    idleTurns: 0,
    log: [],
  };
}

/* ------------------------------------------------------------------ */
/* Legality                                                            */
/* ------------------------------------------------------------------ */

const BEATS: Record<string, string> = {
  scissors: 'paper',
  paper: 'rock',
  rock: 'scissors',
};

/** Can `card` legally be placed on the space at (row, col)? */
export function canPlace(state: GameState, card: Card, row: number, col: number): boolean {
  const space = state.board[row]?.[col];
  if (!space) return false;
  const top = space.cards[space.cards.length - 1];

  if (card.kind === 'trash') {
    // A bomb needs a target, and you never bomb your own team's space.
    if (!top) return false;
    if (top.team === card.team) return false;
    return true;
  }

  if (space.locked) return false;
  if (!top) return true; // any non-trash card may start a space
  if (space.cards.length >= MAX_STACK) return false; // defensive; locked already covers it

  if (card.kind === 'wild') return top.kind !== 'wild';
  return BEATS[card.kind] === top.kind;
}

/** Would placing `card` here seal the space? */
export function wouldLock(state: GameState, card: Card, row: number, col: number): boolean {
  if (card.kind === 'trash') return false;
  const space = state.board[row][col];
  const top = space.cards[space.cards.length - 1];
  if (card.kind === 'wild') return true;
  if (top && top.team === card.team) return true;
  return space.cards.length + 1 >= MAX_STACK;
}

export function getLegalMoves(state: GameState, playerId: string): LegalPlay[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.winner || state.endedBy) return [];
  const moves: LegalPlay[] = [];
  for (const card of player.hand) {
    for (let r = 0; r < state.config.size; r++) {
      for (let c = 0; c < state.config.size; c++) {
        if (!canPlace(state, card, r, c)) continue;
        moves.push({
          cardId: card.id,
          row: r,
          col: c,
          locks: wouldLock(state, card, r, c),
          clears: card.kind === 'trash',
        });
      }
    }
  }
  return moves;
}

export function hasCardsLeft(state: GameState, player: Player): boolean {
  return player.hand.length > 0 || (state.teams[player.team]?.drawPile.length ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Applying moves                                                      */
/* ------------------------------------------------------------------ */

export class IllegalMoveError extends Error {}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function refillHand(state: GameState, player: Player): void {
  const pile = state.teams[player.team]!.drawPile;
  while (player.hand.length < HAND_SIZE && pile.length > 0) {
    player.hand.push(pile.shift()!);
  }
}

/** Advance to the next seat that still has cards. Ends the game if none do. */
function advanceTurn(state: GameState, played: boolean): void {
  state.idleTurns = played ? 0 : state.idleTurns + 1;
  state.turnPhase = 'normal';

  for (let step = 1; step <= state.players.length; step++) {
    const idx = (state.turnIndex + step) % state.players.length;
    const next = state.players[idx];
    refillHand(state, next);
    if (hasCardsLeft(state, next)) {
      state.turnIndex = idx;
      // Everyone stuck in a row: nobody can make progress.
      if (state.idleTurns >= state.players.length) {
        state.endedBy = 'draw';
        state.log.push({ type: 'end', reason: 'draw', winner: null });
      }
      return;
    }
    state.log.push({ type: 'skip', playerId: next.id });
  }

  // No player has any cards anywhere.
  state.endedBy = 'draw';
  state.log.push({ type: 'end', reason: 'draw', winner: null });
}

export function applyMove(state: GameState, playerId: string, move: Move): GameState {
  if (state.winner || state.endedBy) throw new IllegalMoveError('Game is over');

  const next = clone(state);
  const player = next.players[next.turnIndex];
  if (!player || player.id !== playerId) throw new IllegalMoveError('Not your turn');

  if (move.type === 'reshuffle') {
    if (next.turnPhase === 'mustPlay') {
      throw new IllegalMoveError('You have already reshuffled this turn');
    }
    if (getLegalMoves(next, playerId).length > 0) {
      throw new IllegalMoveError('You have a legal move available');
    }
    const pile = next.teams[player.team]!.drawPile;
    pile.push(...player.hand);
    player.hand = [];
    const [shuffled, rng] = shuffle(pile, next.rngState);
    next.teams[player.team]!.drawPile = shuffled;
    next.rngState = rng;
    refillHand(next, player);
    next.log.push({ type: 'reshuffle', playerId });

    if (getLegalMoves(next, playerId).length === 0) {
      // Still stuck after a fresh hand - the turn is forfeit.
      advanceTurn(next, false);
    } else {
      next.turnPhase = 'mustPlay';
    }
    return next;
  }

  const handIndex = player.hand.findIndex((c) => c.id === move.cardId);
  if (handIndex === -1) throw new IllegalMoveError('Card is not in your hand');
  const card = player.hand[handIndex];
  if (!canPlace(next, card, move.row, move.col)) {
    throw new IllegalMoveError('Illegal placement');
  }

  const space = next.board[move.row][move.col];
  player.hand.splice(handIndex, 1);

  if (card.kind === 'trash') {
    const cleared = space.cards.length;
    for (const c of space.cards) next.teams[c.team]!.removed.push(c);
    space.cards = [];
    space.locked = false;
    next.teams[card.team]!.removed.push(card); // the bomb leaves the game too
    next.log.push({ type: 'trash', playerId, card, row: move.row, col: move.col, cleared });
  } else {
    const locks = wouldLock(next, card, move.row, move.col);
    space.cards.push(card);
    space.locked = locks;
    next.log.push({ type: 'place', playerId, card, row: move.row, col: move.col, locked: locks });
  }

  refillHand(next, player);

  const winner = checkWin(next.board, next.config.rowsToWin, player.team);
  if (winner) {
    next.winner = winner;
    next.endedBy = 'rows';
    next.log.push({ type: 'end', reason: 'rows', winner });
    return next;
  }

  advanceTurn(next, true);
  return next;
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

/** Strips hands and draw-pile contents that the given player may not see. */
export function viewFor(state: GameState, playerId: string): PlayerView {
  const you = state.players.find((p) => p.id === playerId);
  if (!you) throw new Error('Unknown player');
  const drawPileCounts: Partial<Record<Team, number>> = {};
  for (const [team, ts] of Object.entries(state.teams)) {
    drawPileCounts[team as Team] = ts!.drawPile.length;
  }
  return {
    config: state.config,
    board: state.board,
    you,
    opponents: state.players
      .filter((p) => p.id !== playerId)
      .map(({ hand, ...rest }) => ({ ...rest, handCount: hand.length })),
    drawPileCounts,
    turnIndex: state.turnIndex,
    turnPhase: state.turnPhase,
    yourTurn: state.players[state.turnIndex]?.id === playerId,
    winner: state.winner,
    endedBy: state.endedBy,
    log: state.log,
  };
}

export function currentPlayer(state: GameState): Player | undefined {
  return state.players[state.turnIndex];
}
