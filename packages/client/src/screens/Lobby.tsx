import { useState } from 'react';
import { teamForSeat } from '@rps/engine';
import { request } from '../socket';
import type { RoomView, SimpleAck } from '../protocol';

export function Lobby({ room, myPlayerId }: { room: RoomView; myPlayerId: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isHost = room.hostPlayerId === myPlayerId;
  const allFull = room.seats.every((s) => s.playerId !== null);
  const allReady = room.seats.every((s) => s.ready);
  const mySeat = room.seats.find((s) => s.playerId === myPlayerId);

  async function pickSeat(seat: number) {
    if (busy) return;
    setBusy(true);
    const ack = await request<{ seat: number }, SimpleAck>('seat:pick', { seat });
    setBusy(false);
    if (!ack.ok) setError(ack.error);
  }

  async function toggleReady() {
    if (busy) return;
    setBusy(true);
    const ack = await request<{ ready: boolean }, SimpleAck>('player:ready', { ready: !mySeat?.ready });
    setBusy(false);
    if (!ack.ok) setError(ack.error);
  }

  async function start() {
    if (busy) return;
    setBusy(true);
    const ack = await request<Record<string, never>, SimpleAck>('game:start', {});
    setBusy(false);
    if (!ack.ok) setError(ack.error);
  }

  return (
    <div className="panel">
      <h2>
        Room <span className="room-code">{room.code}</span>
      </h2>
      <p style={{ color: 'var(--muted)' }}>Share the code with your friends.</p>

      <div className="seat-list">
        {room.seats.map((seat) => {
          const team = teamForSeat(seat.seat, room.teamCount);
          const empty = seat.playerId === null;
          return (
            <div
              key={seat.seat}
              className={['seat', empty ? 'open' : '', seat.playerId === myPlayerId ? 'mine' : '']
                .join(' ')
                .trim()}
              onClick={empty && !busy ? () => pickSeat(seat.seat) : undefined}
            >
              <span className={`team-dot ${team}`} />
              <span className="seat-name">{empty ? 'Open seat - click to sit here' : seat.name}</span>
              {!empty && seat.playerId === room.hostPlayerId && <span className="badge">Host</span>}
              {!empty && !seat.connected && <span className="badge disconnected">Disconnected</span>}
              {!empty && seat.ready && <span className="badge ready">Ready</span>}
            </div>
          );
        })}
      </div>

      <div className="actions">
        <button onClick={toggleReady} disabled={busy}>
          {mySeat?.ready ? 'Not ready' : 'Ready'}
        </button>
        {isHost && (
          <button className="secondary" onClick={start} disabled={busy || !allFull || !allReady}>
            Start game
          </button>
        )}
      </div>
      <p className="error-text">{error}</p>
    </div>
  );
}
