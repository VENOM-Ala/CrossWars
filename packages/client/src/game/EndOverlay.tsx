import type { EndReason, Team } from '@rps/engine';

export function EndOverlay({
  winner,
  endedBy,
  isHost,
  onRematch,
  disabled,
}: {
  winner: Team | null;
  endedBy: EndReason;
  isHost: boolean;
  onRematch: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>{winner ? `${winner.toUpperCase()} wins!` : 'Draw'}</h2>
        <p style={{ color: 'var(--muted)' }}>
          {endedBy === 'rows' ? 'Four in a row.' : 'Nobody could make a move.'}
        </p>
        {isHost ? (
          <button onClick={onRematch} disabled={disabled}>
            Rematch
          </button>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Waiting for the host to start a rematch...</p>
        )}
      </div>
    </div>
  );
}
