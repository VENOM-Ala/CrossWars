import { useEffect, useState } from 'react';
import type { PlayerView } from '@rps/engine';

export function TurnBanner({ view, turnDeadline }: { view: PlayerView; turnDeadline: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!turnDeadline) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [turnDeadline]);

  const secondsLeft = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;
  const whoseTurn = view.yourTurn ? 'Your turn' : `${currentOpponentName(view)}'s turn`;
  const suffix = view.turnPhase === 'mustPlay' ? ' - you must play the fresh hand' : '';

  return (
    <div className={`turn-banner ${view.yourTurn ? 'yours' : ''}`}>
      {whoseTurn}
      {suffix}
      {secondsLeft !== null && ` (${secondsLeft}s)`}
    </div>
  );
}

function currentOpponentName(view: PlayerView): string {
  const current = view.opponents.find((o) => o.seat === view.turnIndex);
  return current?.name ?? 'Someone';
}
