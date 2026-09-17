export interface SocketData {
  playerId?: string;
  roomCode?: string;
}

export type AckFn<T extends object> = (
  response: ({ ok: true } & T) | { ok: false; error: string },
) => void;
