# @rps/engine

Pure, UI-free game logic. No DOM, no network, no timers. The server imports it as
the authority; the client imports the same module to highlight legal spaces
instantly before the server confirms.

```bash
npm install
npm test        # 99 tests
npm run typecheck
```

## API

| Function | Purpose |
| --- | --- |
| `makeConfig(playerCount, teamCount)` | Validates a lobby setup, returns board size and rows-to-win. |
| `teamOptionsFor(playerCount)` | Which team counts the host may choose. |
| `createGame(seats, teamCount, seed)` | Builds decks, seats players, deals 3 cards each. |
| `getLegalMoves(state, playerId)` | Every legal (card, space) pair, flagged with `locks` / `clears`. |
| `canPlace(state, card, row, col)` | Single-placement check. |
| `applyMove(state, playerId, move)` | Returns a new state; throws `IllegalMoveError`. |
| `checkWin(board, rowsToWin, preferTeam)` | Winning team or `null`. |
| `viewFor(state, playerId)` | Strips other hands and pile contents. |
| `simulate(state, seed)` | Random-play a whole game; used for balance testing. |

Everything is deterministic: a match replays exactly from its seed plus its move
list, which makes bug reports reproducible.

## Rules as encoded

**Setup.** Supported player counts are 2, 3, 4, 6, 8, 9, 10, 12. Team count is
fixed except at 6 and 12 players, where the host picks 2 or 3. Boards: 4×4 for
2–4 players, 6×6 for 6–9, 8×8 for 10–12. Each team deck holds 10 each of rock,
paper and scissors up to 6 players and 20 each above that, plus 3 wilds and 2
bombs per player on that team. Seats alternate teams strictly in order.

**Placement.** Any non-bomb card starts an empty space. Scissors covers paper,
paper covers rock, rock covers scissors. A wild covers anything except another
wild. Nothing may be placed on a locked space.

**Locking.** A space seals when a third card lands on it, when a card lands on
its own team's colour, or whenever a wild is played — including a wild onto an
empty space. The top card stays visible; the lock is a display state, not a
hidden card.

**Bombs (trash).** Require a target: never an empty space, and never a space
topped by your own team. They clear the whole stack, unlock the space, and every
card involved — including the bomb — leaves the game permanently.

**Turn.** Play one card, refill to three. If you have no legal move you reveal,
return your hand to the pile, reshuffle, draw three, and then play; if the fresh
hand is still unplayable the turn passes. Only one reshuffle per turn.

**Ending.** Four aligned spaces topped by one team wins — one row for 2–8
players, two for 9–12. Locked spaces and wilds count for the team that owns the
top card. Two winning rows may share a card. A player with an empty hand and an
empty pile is skipped; when nobody can move the game is a draw.

## Two decisions worth reviewing

1. **A line of five counts as two rows.** Rows are counted as distinct windows of
   four, and overlapping windows are allowed because you asked that two winning
   rows be able to share a card. That makes a run of five an instant win in
   9–12 player games. If you want two *disjoint* rows instead, `countLines` is
   the only place to change.
2. **Stalemate guard.** If every player in a full circuit fails to play, the game
   is declared a draw rather than looping forever. This never fired in 1,800
   simulated games but protects the server from a hang.

## Simulation output

From the current test run, 200 random games per configuration:

| Players / teams | Decisive | Avg turns |
| --- | --- | --- |
| 2 / 2 | 98% | 23.6 |
| 3 / 3 | 66% | 39.2 |
| 4 / 2 | 97% | 25.6 |
| 6 / 2 | 100% | 31.2 |
| 6 / 3 | 100% | 47.0 |
| 8 / 2 | 100% | 30.4 |
| 9 / 3 | 91% | 79.3 |
| 10 / 2 | 100% | 53.8 |
| 12 / 3 | 100% | 84.9 |

Random play is the worst case, so real games should be shorter and more
decisive. The 3-player number is the one to watch: a third of those games ended
in a draw because three teams on a 4×4 board burn through 35-card decks while
constantly bombing each other.
