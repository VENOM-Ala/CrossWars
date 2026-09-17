import type { Card as CardModel } from '@rps/engine';

const GLYPH: Record<CardModel['kind'], string> = {
  rock: 'R',
  paper: 'P',
  scissors: 'S',
  wild: '★',
  trash: '💣',
};

export function Card({
  card,
  selected,
  onClick,
}: {
  card: CardModel;
  selected?: boolean;
  onClick?: () => void;
}) {
  const classes = ['card', `team-${card.team}`];
  if (onClick) classes.push('hand-card');
  if (selected) classes.push('selected');
  return (
    <div className={classes.join(' ')} onClick={onClick} title={`${card.team} ${card.kind}`}>
      {GLYPH[card.kind]}
    </div>
  );
}
