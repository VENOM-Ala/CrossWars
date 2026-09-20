# Project context

Web version of a physical board game: tactical card placement on a grid, teams
race to line up four spaces of their colour. React + Node/WebSockets, private
rooms with join codes, anonymous players, no database.

## State of the work

`packages/engine` is complete and tested (99 tests, clean typecheck). It is pure
logic — no DOM, no network, no timers — and is the authority for every rule.
Read `packages/engine/README.md` first; it documents the full rule set as
encoded, the public API, and two open design decisions.

Nothing else exists yet.

## Build order from here

1. **`packages/server`** — Node + Socket.IO. Rooms in memory keyed by a 4–6
   character join code. Host sets player count and team count (validate with
   `teamOptionsFor`). Lobby: join, pick seat, ready, start. In-game: receive a
   `Move`, call `applyMove`, broadcast `viewFor(state, playerId)` to each player
   individually so hands stay secret. Reconnect by session token held in
   `localStorage`. Turn timer with auto-forfeit. Clean up idle rooms. Validate
   every inbound message with Zod.
2. **`packages/client`** — Vite + React. Three screens: Home (create/join),
   Lobby (seats, teams, ready), Game (board, hand, stack peek, locked badge,
   turn banner, draw-pile counts, win/draw/rematch). Import the engine directly
   to highlight legal spaces the instant a card is selected, before the server
   replies. Plain CSS shapes for cards first; art later.
3. **Edge cases** — disconnect mid-turn, host leaves, empty draw pile, refresh,
   double-submit, room full.
4. **Polish** — animations for place/bomb/lock, sound, mobile layout, tutorial.
5. **Deploy** — one Node process serving the built client. Railway or Fly.

## Rules decisions already settled

These came from the game's designer and should not be re-derived:

- Player counts 2, 3, 4, 6, 8, 9, 10, 12. 5, 7 and 11 are unsupported. Team
  count is forced except at 6 and 12 players, where the host chooses 2 or 3.
- 10 each of rock/paper/scissors per team deck up to 6 players, 20 each above.
  3 wilds and 2 bombs per player on that team.
- A bomb cannot target an empty space or a space topped by your own team.
  Everything it clears, including itself, leaves the game permanently.
- Placing on your own team's card locks the space. So does a third card, and so
  does any wild — including a wild played onto an empty space.
- Locked spaces stay face-up in the web version and count for the team whose
  card is on top. Wilds count as their team's colour.
- No legal move: reveal, return hand to pile, reshuffle, draw three, then play.
  One reshuffle per turn; if still stuck the turn passes.
- Out of cards entirely: the player is skipped. Nobody can move: draw.
- Two winning rows may share a card.
- The smallest board is 6×6 (2–9 players); 8×8 for 10–12 players.

## Open questions for the designer

1. A line of five currently counts as two winning rows, since rows are counted
   as overlapping windows of four. Confirm or switch to disjoint rows.

## Conventions

TypeScript throughout, ES modules, strict mode. Vitest for tests. The engine
stays free of I/O: anything touching sockets, timers or storage belongs in the
server. Every rule change starts with a failing test in `packages/engine/test`.
