import type { Board as BoardModel } from '@rps/engine';
import type { LegalPlay } from '@rps/engine';
import { Card } from './Card';

export function Board({
  board,
  legalMoves,
  onPlay,
}: {
  board: BoardModel;
  legalMoves: LegalPlay[];
  onPlay: (row: number, col: number) => void;
}) {
  const size = board.length;
  const legalAt = (row: number, col: number) => legalMoves.find((m) => m.row === row && m.col === col);

  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${size}, auto)` }}>
      {board.map((row, r) =>
        row.map((space, c) => {
          const legal = legalAt(r, c);
          const top = space.cards[space.cards.length - 1];
          const under = space.cards.slice(0, -1);
          return (
            <div
              key={`${r}-${c}`}
              className={['space', space.locked ? 'locked' : '', legal ? 'legal' : ''].join(' ').trim()}
              onClick={() => legal && onPlay(r, c)}
            >
              {top && <Card card={top} />}
              {under.length > 0 && (
                <div className="stack-peek">
                  {under.map((card) => (
                    <div key={card.id} className={`chip team-${card.team}`} title={`${card.team} ${card.kind}`} />
                  ))}
                </div>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
