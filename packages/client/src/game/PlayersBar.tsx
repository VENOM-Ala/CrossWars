import type { PlayerView } from '@rps/engine';
import type { RoomView } from '../protocol';

export function PlayersBar({ view, room }: { view: PlayerView; room: RoomView | null }) {
  const players = [
    { id: view.you.id, name: view.you.name, team: view.you.team, seat: view.you.seat, handCount: view.you.hand.length, isYou: true },
    ...view.opponents.map((o) => ({
      id: o.id,
      name: o.name,
      team: o.team,
      seat: o.seat,
      handCount: o.handCount,
      isYou: false,
    })),
  ].sort((a, b) => a.seat - b.seat);

  return (
    <div className="players-bar">
      {players.map((p) => {
        const seat = room?.seats.find((s) => s.playerId === p.id);
        return (
          <div key={p.id} className={['player-chip', p.seat === view.turnIndex ? 'current' : ''].join(' ').trim()}>
            <span className={`team-dot ${p.team}`} />
            <span>
              {p.name}
              {p.isYou ? ' (you)' : ''}
            </span>
            <span className="muted">{p.handCount} cards</span>
            {room?.hostPlayerId === p.id && <span className="badge">Host</span>}
            {seat && !seat.connected && <span className="badge disconnected">Disconnected</span>}
          </div>
        );
      })}
    </div>
  );
}
