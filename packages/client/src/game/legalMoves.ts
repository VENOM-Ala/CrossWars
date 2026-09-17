import type { GameState, LegalPlay, Player, PlayerView } from '@rps/engine';
import { getLegalMoves } from '@rps/engine';

/**
 * getLegalMoves only ever reads config.size, board, players (to find the mover's hand)
 * and winner/endedBy - never teams or rngState - so a PlayerView (which carries all of
 * those) is a safe stand-in for the full GameState the engine's type signature expects.
 */
function viewToLegalMoveState(view: PlayerView): GameState {
  const players: Player[] = [
    view.you,
    ...view.opponents.map((o) => ({ ...o, hand: [] })),
  ];
  return {
    config: view.config,
    board: view.board,
    players,
    winner: view.winner,
    endedBy: view.endedBy,
    teams: {},
    turnIndex: 0,
    turnPhase: view.turnPhase,
    rngState: 0,
    idleTurns: 0,
    log: [],
  };
}

export function legalMovesFor(view: PlayerView): LegalPlay[] {
  if (!view.yourTurn) return [];
  return getLegalMoves(viewToLegalMoveState(view), view.you.id);
}
