export const PORT = Number(process.env.PORT ?? 3001);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? '*';

/** How long a player has to act before the server auto-plays for them. */
export const TURN_TIMER_MS = Number(process.env.TURN_TIMER_MS ?? 60_000);

/** Rooms with no activity for this long are swept up. */
export const ROOM_IDLE_MS = Number(process.env.ROOM_IDLE_MS ?? 30 * 60_000);

export const CLEANUP_INTERVAL_MS = 60_000;
