import { useEffect, useRef, useState } from 'react';
import type { Move } from '@rps/engine';
import { request } from '../socket';
import type { GameViewPayload, RoomView, SimpleAck } from '../protocol';
import { legalMovesFor } from '../game/legalMoves';
import { Board, type BoardEffect } from '../game/Board';
import { Hand } from '../game/Hand';
import { TurnBanner } from '../game/TurnBanner';
import { DrawPiles } from '../game/DrawPiles';
import { PlayersBar } from '../game/PlayersBar';
import { EndOverlay } from '../game/EndOverlay';
import { SoundToggle } from '../game/SoundToggle';
import { sound } from '../sound';

const EFFECT_DURATION_MS = 700;

export function Game({
  game,
  room,
  isHost,
  roomCode,
}: {
  game: GameViewPayload;
  room: RoomView | null;
  isHost: boolean;
  roomCode: string;
}) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [effects, setEffects] = useState<BoardEffect[]>([]);
  const { view, turnDeadline } = game;
  // Don't animate/replay the whole history on mount (e.g. reconnecting mid-game) -
  // only entries that arrive after we're already watching.
  const seenLogLength = useRef(view.log.length);

  useEffect(() => {
    if (view.log.length <= seenLogLength.current) return;
    const newEntries = view.log.slice(seenLogLength.current);
    seenLogLength.current = view.log.length;

    const added: BoardEffect[] = [];
    for (const entry of newEntries) {
      if (entry.type === 'place') {
        added.push({ id: `${Date.now()}-${Math.random()}`, row: entry.row, col: entry.col, kind: entry.locked ? 'lock' : 'place' });
        entry.locked ? sound.lock() : sound.place();
      } else if (entry.type === 'trash') {
        added.push({ id: `${Date.now()}-${Math.random()}`, row: entry.row, col: entry.col, kind: 'trash' });
        sound.bomb();
      } else if (entry.type === 'end') {
        entry.winner ? sound.win() : sound.draw();
      }
    }
    if (added.length === 0) return;
    setEffects((prev) => [...prev, ...added]);
    const ids = added.map((e) => e.id);
    setTimeout(() => setEffects((prev) => prev.filter((e) => !ids.includes(e.id))), EFFECT_DURATION_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.log.length]);

  const allLegal = legalMovesFor(view);
  const legalForSelected = selectedCardId ? allLegal.filter((m) => m.cardId === selectedCardId) : [];
  const gameOver = Boolean(view.winner || view.endedBy);

  async function playMove(row: number, col: number) {
    if (!selectedCardId || submitting) return;
    const move: Move = { type: 'play', cardId: selectedCardId, row, col };
    setSelectedCardId(null);
    setSubmitting(true);
    const ack = await request<Move, SimpleAck>('game:move', move);
    setSubmitting(false);
    if (!ack.ok) console.error(ack.error);
  }

  async function reshuffle() {
    if (submitting) return;
    const move: Move = { type: 'reshuffle' };
    setSubmitting(true);
    const ack = await request<Move, SimpleAck>('game:move', move);
    setSubmitting(false);
    if (!ack.ok) console.error(ack.error);
  }

  async function rematch() {
    if (submitting) return;
    setSubmitting(true);
    await request<Record<string, never>, SimpleAck>('game:rematch', {});
    setSubmitting(false);
  }

  return (
    <div className="game-screen">
      <div className="screen-header">
        <span>Room {roomCode}</span>
        <SoundToggle />
      </div>
      <PlayersBar view={view} room={room} />
      <TurnBanner view={view} turnDeadline={turnDeadline} />
      <DrawPiles counts={view.drawPileCounts} />
      <Board board={view.board} legalMoves={legalForSelected} effects={effects} onPlay={playMove} />
      <Hand
        hand={view.you.hand}
        selectedCardId={selectedCardId}
        onSelect={(id) => setSelectedCardId(id === selectedCardId ? null : id)}
        showReshuffle={view.yourTurn && view.turnPhase === 'normal' && allLegal.length === 0}
        onReshuffle={reshuffle}
        disabled={!view.yourTurn || gameOver || submitting}
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
          disabled={submitting}
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
