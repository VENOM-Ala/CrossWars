import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { CLIENT_ORIGIN, PORT } from './config';
import { RoomStore } from './rooms/store';
import { registerSocketHandlers } from './socket/index';
import { startCleanupSweep } from './rooms/cleanup';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

const store = new RoomStore();
registerSocketHandlers(io, store);
startCleanupSweep(io, store);

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: store.size });
});

httpServer.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
