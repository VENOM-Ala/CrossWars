import { io, type Socket } from 'socket.io-client';

// In production the server serves the built client from the same origin, so
// no URL means "connect back to wherever this page came from." Local dev sets
// VITE_SERVER_URL (see .env.development) since Vite and the server run on
// different ports.
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) || undefined;

export const socket: Socket = io(SERVER_URL, { autoConnect: true });

/** Wraps a socket.io ack in a promise; resolves `{ ok: false }` if the server never answers. */
export function request<Req extends object, Res>(event: string, payload: Req): Promise<Res> {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload, (err: Error | null, res: Res) => {
      if (err) {
        resolve({ ok: false, error: 'Server did not respond' } as Res);
        return;
      }
      resolve(res);
    });
  });
}
