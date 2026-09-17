export function Tutorial({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-content tutorial" onClick={(e) => e.stopPropagation()}>
        <h2>How to play</h2>
        <div className="tutorial-body">
          <p>
            Teams race to line up four spaces of their colour on the board. Rock, paper, scissors,
            wild, and bomb cards are dealt from your team's shared deck.
          </p>
          <ul>
            <li>
              <strong>Placing:</strong> scissors covers paper, paper covers rock, rock covers
              scissors. A wild covers anything except another wild. Any of these may start an
              empty space.
            </li>
            <li>
              <strong>Locking:</strong> a space locks when a third card lands on it, when a card
              lands on your own team's colour, or whenever a wild is played - even onto an empty
              space. Locked spaces stay face-up and count for whoever's on top.
            </li>
            <li>
              <strong>Bombs:</strong> must target a space that isn't empty and isn't already yours.
              They clear the whole stack, and everything involved (including the bomb) leaves the
              game for good.
            </li>
            <li>
              <strong>Your turn:</strong> play one card, then refill to three. No legal move? Reveal
              your hand, reshuffle it into the pile, draw three, and try again - once per turn. Still
              stuck? Your turn passes.
            </li>
            <li>
              <strong>Winning:</strong> four aligned spaces topped by one team wins. If nobody can
              move, it's a draw.
            </li>
          </ul>
        </div>
        <button onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
