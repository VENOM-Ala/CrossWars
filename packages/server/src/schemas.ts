import { z } from 'zod';

const name = z.string().trim().min(1).max(24);

export const createRoomSchema = z.object({
  playerCount: z.number().int(),
  teamCount: z.union([z.literal(2), z.literal(3)]).optional(),
  name,
});

export const joinRoomSchema = z.object({
  code: z.string().trim().min(4).max(6),
  name,
});

export const reconnectSchema = z.object({
  token: z.string().min(1),
});

export const pickSeatSchema = z.object({
  seat: z.number().int().min(0),
});

export const readySchema = z.object({
  ready: z.boolean(),
});

export const startSchema = z.object({}).strict();

export const moveSchema = z.union([
  z.object({
    type: z.literal('play'),
    cardId: z.string().min(1),
    row: z.number().int().min(0),
    col: z.number().int().min(0),
  }),
  z.object({ type: z.literal('reshuffle') }),
]);

export const rematchSchema = z.object({}).strict();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type ReconnectInput = z.infer<typeof reconnectSchema>;
export type PickSeatInput = z.infer<typeof pickSeatSchema>;
export type ReadyInput = z.infer<typeof readySchema>;
export type MoveInput = z.infer<typeof moveSchema>;
