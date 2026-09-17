import type { Team } from '@rps/engine';

export function DrawPiles({ counts }: { counts: Partial<Record<Team, number>> }) {
  return (
    <div className="draw-piles">
      {Object.entries(counts).map(([team, count]) => (
        <div className="pile" key={team}>
          <span className={`team-dot ${team}`} />
          {count} left
        </div>
      ))}
    </div>
  );
}
