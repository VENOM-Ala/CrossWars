import { useState } from 'react';
import type { Move } from '@rps/engine';
import { request } from '../socket';
import type { GameViewPayload, SimpleAck } from '../protocol';
import { legalMovesFor } from '../game/legalMoves';
import { Board } from '../game/Board';
import { Hand } from '../game/Hand';
import { TurnBanner } from '../game/TurnBanner';
import { DrawPiles } from '../game/DrawPiles';
import { EndOverlay } from '../game/EndOverlay';

export function Game({
  game,
  isHost,
  roomCode,
}: {
  game: GameViewPayload;
  isHost: boolean;
  roomCode: string;
}) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const { view, turnDeadline } = game;

  const allLegal = legalMovesFor(view);
  const legalForSelected = selectedCardId ? allLegal.filter((m) => m.cardId === selectedCardId) : [];
  const gameOver = Boolean(view.winner || view.endedBy);

  async function playMove(row: number, col: number) {
    if (!selectedCardId) return;
    const move: Move = { type: 'play', cardId: selectedCardId, row, col };
    setSelectedCardId(null);
    const ack = await request<Move, SimpleAck>('game:move', move);
    if (!ack.ok) console.error(ack.error);
  }

  async function reshuffle() {
    const move: Move = { type: 'reshuffle' };
    const ack = await request<Move, SimpleAck>('game:move', move);
    if (!ack.ok) console.error(ack.error);
  }

  async function rematch() {
    await request<Record<string, never>, SimpleAck>('game:rematch', {});
  }

  return (
    <div className="game-screen">
      <div className="turn-banner" style={{ background: 'transparent', border: 'none', padding: 0 }}>
        Room {roomCode}
      </div>
      <TurnBanner view={view} turnDeadline={turnDeadline} />
      <DrawPiles counts={view.drawPileCounts} />
      <Board board={view.board} legalMoves={legalForSelected} onPlay={playMove} />
      <Hand
        hand={view.you.hand}
        selectedCardId={selectedCardId}
        onSelect={(id) => setSelectedCardId(id === selectedCardId ? null : id)}
        showReshuffle={view.yourTurn && view.turnPhase === 'normal' && allLegal.length === 0}
        onReshuffle={reshuffle}
        disabled={!view.yourTurn || gameOver}
      />
      <div className="log">
        {view.log.slice(-20).map((entry, i) => (
          <div key={i}>{describeLogEntry(entry)}</div>
        ))}
      </div>
      {gameOver && (
        <EndOverlay
          winner={view.winner}
          endedBy={view.endedBy!}
          isHost={isHost}
          onRematch={rematch}
        />
      )}
    </div>
  );
}

function describeLogEntry(entry: import('@rps/engine').LogEntry): string {
  switch (entry.type) {
    case 'place':
      return `${entry.card.team} played ${entry.card.kind} at (${entry.row}, ${entry.col})${entry.locked ? ' - locked' : ''}`;
    case 'trash':
      return `${entry.card.team} bombed (${entry.row}, ${entry.col}), clearing ${entry.cleared} card(s)`;
    case 'reshuffle':
      return 'A player reshuffled their hand';
    case 'skip':
      return 'A player was skipped (out of cards)';
    case 'end':
      return entry.winner ? `Game over - ${entry.winner} wins` : 'Game over - draw';
    default:
      return '';
  }
}
