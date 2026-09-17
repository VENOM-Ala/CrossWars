import type { Card as CardModel } from '@rps/engine';
import { Card } from './Card';

export function Hand({
  hand,
  selectedCardId,
  onSelect,
  showReshuffle,
  onReshuffle,
  disabled,
}: {
  hand: CardModel[];
  selectedCardId: string | null;
  onSelect: (cardId: string) => void;
  showReshuffle: boolean;
  onReshuffle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="hand-actions">
      <div className="hand">
        {hand.map((card) => (
          <Card
            key={card.id}
            card={card}
            selected={card.id === selectedCardId}
            onClick={disabled ? undefined : () => onSelect(card.id)}
          />
        ))}
      </div>
      {showReshuffle && (
        <button className="secondary" onClick={onReshuffle} disabled={disabled}>
          No legal moves - Reshuffle
        </button>
      )}
    </div>
  );
}
