import type { Board as BoardModel } from '@rps/engine';
import type { LegalPlay } from '@rps/engine';
import { Card } from './Card';

export interface BoardEffect {
  id: string;
  row: number;
  col: number;
  kind: 'place' | 'lock' | 'trash';
}

export function Board({
  board,
  legalMoves,
  effects,
  onPlay,
}: {
  board: BoardModel;
  legalMoves: LegalPlay[];
  effects: BoardEffect[];
  onPlay: (row: number, col: number) => void;
}) {
  const size = board.length;
  const legalAt = (row: number, col: number) => legalMoves.find((m) => m.row === row && m.col === col);
  const effectAt = (row: number, col: number) => effects.filter((e) => e.row === row && e.col === col);

  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${size}, auto)`, ['--board-size' as string]: size }}
    >
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
              {effectAt(r, c).map((e) => (
                <div key={e.id} className={`fx fx-${e.kind}`} />
              ))}
            </div>
          );
        }),
      )}
    </div>
  );
}
