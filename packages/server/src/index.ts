import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

// Deploy runs one process: this server also serves the client's built assets.
// In local dev the client isn't built (Vite serves it separately), so skip
// silently if the dist directory isn't there.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

httpServer.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
