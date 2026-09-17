import { Card, GameConfig, BoardSize, Team, TEAM_ORDER } from './types';
import { shuffle } from './rng';

export const WILDS_PER_PLAYER = 3;
export const TRASH_PER_PLAYER = 2;
export const HAND_SIZE = 3;
export const LINE_LENGTH = 4;
export const MAX_STACK = 3;

interface CountRow {
  size: BoardSize;
  rowsToWin: 1 | 2;
  teamOptions: Array<2 | 3>;
}

/** 5, 7 and 11 players are unsupported by design. */
export const PLAYER_TABLE: Record<number, CountRow> = {
  2: { size: 4, rowsToWin: 1, teamOptions: [2] },
  3: { size: 4, rowsToWin: 1, teamOptions: [3] },
  4: { size: 4, rowsToWin: 1, teamOptions: [2] },
  6: { size: 6, rowsToWin: 1, teamOptions: [2, 3] },
  8: { size: 6, rowsToWin: 1, teamOptions: [2] },
  9: { size: 6, rowsToWin: 2, teamOptions: [3] },
  10: { size: 8, rowsToWin: 2, teamOptions: [2] },
  12: { size: 8, rowsToWin: 2, teamOptions: [2, 3] },
};

export function supportedPlayerCounts(): number[] {
  return Object.keys(PLAYER_TABLE)
    .map(Number)
    .sort((a, b) => a - b);
}

export function teamOptionsFor(playerCount: number): Array<2 | 3> {
  return PLAYER_TABLE[playerCount]?.teamOptions ?? [];
}

export function makeConfig(playerCount: number, teamCount: 2 | 3): GameConfig {
  const row = PLAYER_TABLE[playerCount];
  if (!row) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }
  if (!row.teamOptions.includes(teamCount)) {
    throw new Error(
      `${playerCount} players cannot be played with ${teamCount} teams (allowed: ${row.teamOptions.join(', ')})`,
    );
  }
  if (playerCount % teamCount !== 0) {
    throw new Error(`${playerCount} players do not divide evenly into ${teamCount} teams`);
  }
  return { playerCount, teamCount, size: row.size, rowsToWin: row.rowsToWin };
}

export function teamsInPlay(teamCount: 2 | 3): Team[] {
  return TEAM_ORDER.slice(0, teamCount);
}

/** Seat order alternates strictly between teams: A, B, C, A, B, C, ... */
export function teamForSeat(seat: number, teamCount: 2 | 3): Team {
  return TEAM_ORDER[seat % teamCount];
}

/** 10 of each standard kind up to 6 players, 20 of each above that. */
export function standardCopies(playerCount: number): number {
  return playerCount <= 6 ? 10 : 20;
}

export function buildDeck(team: Team, playerCount: number, playersOnTeam: number): Card[] {
  const copies = standardCopies(playerCount);
  const cards: Card[] = [];
  let n = 0;
  const push = (kind: Card['kind'], count: number) => {
    for (let i = 0; i < count; i++) cards.push({ id: `${team}-${kind}-${n++}`, team, kind });
  };
  push('rock', copies);
  push('paper', copies);
  push('scissors', copies);
  push('wild', WILDS_PER_PLAYER * playersOnTeam);
  push('trash', TRASH_PER_PLAYER * playersOnTeam);
  return cards;
}

export function buildShuffledDeck(
  team: Team,
  playerCount: number,
  playersOnTeam: number,
  rngState: number,
): [Card[], number] {
  return shuffle(buildDeck(team, playerCount, playersOnTeam), rngState);
}
