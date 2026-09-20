export type Team = 'red' | 'blue' | 'green';

export const TEAM_ORDER: Team[] = ['red', 'blue', 'green'];

export type CardKind = 'rock' | 'paper' | 'scissors' | 'wild' | 'trash';

export interface Card {
  id: string;
  team: Team;
  kind: CardKind;
}

/** A single board space. `cards[cards.length - 1]` is the visible top card. */
export interface Space {
  cards: Card[];
  locked: boolean;
}

export type Board = Space[][];

export interface Player {
  id: string;
  name: string;
  team: Team;
  /** Seat index; turn order is strictly seat order. */
  seat: number;
  hand: Card[];
}

export interface TeamState {
  drawPile: Card[];
  /** Cards permanently out of the game (trashed, or cleared by a bomb). */
  removed: Card[];
}

export type BoardSize = 6 | 8;

export interface GameConfig {
  playerCount: number;
  teamCount: 2 | 3;
  size: BoardSize;
  rowsToWin: 1 | 2;
}

export type EndReason = 'rows' | 'draw';

/**
 * `normal`      – player may play a card, or declare no-legal-move.
 * `mustPlay`    – player has reshuffled this turn and must now play.
 */
export type TurnPhase = 'normal' | 'mustPlay';

export interface GameState {
  config: GameConfig;
  board: Board;
  /** Ordered by seat. */
  players: Player[];
  teams: Partial<Record<Team, TeamState>>;
  turnIndex: number;
  turnPhase: TurnPhase;
  winner: Team | null;
  endedBy: EndReason | null;
  rngState: number;
  /** Consecutive turns that ended without a card being played (stalemate guard). */
  idleTurns: number;
  log: LogEntry[];
}

export type LogEntry =
  | { type: 'place'; playerId: string; card: Card; row: number; col: number; locked: boolean }
  | { type: 'trash'; playerId: string; card: Card; row: number; col: number; cleared: number }
  | { type: 'reshuffle'; playerId: string }
  | { type: 'skip'; playerId: string }
  | { type: 'end'; reason: EndReason; winner: Team | null };

export type Move =
  | { type: 'play'; cardId: string; row: number; col: number }
  | { type: 'reshuffle' };

export interface LegalPlay {
  cardId: string;
  row: number;
  col: number;
  /** True if making this play would lock the space. */
  locks: boolean;
  /** True if this is a trash (bomb) play. */
  clears: boolean;
}

/** What a single player is allowed to see. */
export interface PlayerView {
  config: GameConfig;
  board: Board;
  you: Player;
  opponents: Array<Omit<Player, 'hand'> & { handCount: number }>;
  drawPileCounts: Partial<Record<Team, number>>;
  turnIndex: number;
  turnPhase: TurnPhase;
  yourTurn: boolean;
  winner: Team | null;
  endedBy: EndReason | null;
  log: LogEntry[];
}
