import { Board, Team } from './types';
import { LINE_LENGTH } from './setup';

export interface Line {
  team: Team;
  cells: Array<[number, number]>;
}

const DIRECTIONS: Array<[number, number]> = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal down-right
  [1, -1], // diagonal down-left
];

export function topTeam(board: Board, row: number, col: number): Team | null {
  const space = board[row]?.[col];
  if (!space || space.cards.length === 0) return null;
  return space.cards[space.cards.length - 1].team;
}

/**
 * Every distinct window of 4 aligned spaces topped by the same team.
 * Windows may overlap: the rules allow two winning rows to share a card, so a
 * line of 5 legitimately counts as two rows.
 */
export function findLines(board: Board): Line[] {
  const size = board.length;
  const lines: Line[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const team = topTeam(board, r, c);
      if (!team) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const endR = r + dr * (LINE_LENGTH - 1);
        const endC = c + dc * (LINE_LENGTH - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
        const cells: Array<[number, number]> = [[r, c]];
        let ok = true;
        for (let k = 1; k < LINE_LENGTH; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (topTeam(board, rr, cc) !== team) {
            ok = false;
            break;
          }
          cells.push([rr, cc]);
        }
        if (ok) lines.push({ team, cells });
      }
    }
  }
  return lines;
}

export function countLines(board: Board, team: Team): number {
  return findLines(board).filter((l) => l.team === team).length;
}

/** Returns the winning team, preferring `preferTeam` if several qualify at once. */
export function checkWin(board: Board, rowsToWin: number, preferTeam?: Team): Team | null {
  const counts = new Map<Team, number>();
  for (const line of findLines(board)) {
    counts.set(line.team, (counts.get(line.team) ?? 0) + 1);
  }
  if (preferTeam && (counts.get(preferTeam) ?? 0) >= rowsToWin) return preferTeam;
  for (const [team, count] of counts) {
    if (count >= rowsToWin) return team;
  }
  return null;
}
