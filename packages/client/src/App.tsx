import { useCallback, useEffect, useState } from 'react';
import { request, socket } from './socket';
import { clearSession, loadSession, saveSession, type StoredSession } from './session';
import type { GameViewPayload, ReconnectAck, RoomClosedPayload, RoomView } from './protocol';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';

export function App() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [game, setGame] = useState<GameViewPayload | null>(null);
  const [notice, setNotice] = useState('');
  const [checkedStoredSession, setCheckedStoredSession] = useState(false);

  useEffect(() => {
    function onRoomState(view: RoomView) {
      setRoom(view);
      // Only clear a held game view once we're actually back in the lobby (post-rematch) -
      // a start/end transition broadcasts room:state right before the fresh game:view.
      if (view.phase === 'lobby') setGame(null);
    }
    function onGameView(payload: GameViewPayload) {
      setGame(payload);
    }
    function onRoomClosed(payload: RoomClosedPayload) {
      setNotice(`Room closed: ${payload.reason}`);
      clearSession();
      setSession(null);
      setRoom(null);
      setGame(null);
    }
    socket.on('room:state', onRoomState);
    socket.on('game:view', onGameView);
    socket.on('room:closed', onRoomClosed);
    return () => {
      socket.off('room:state', onRoomState);
      socket.off('game:view', onGameView);
      socket.off('room:closed', onRoomClosed);
    };
  }, []);

  useEffect(() => {
    function syncSession() {
      const stored = loadSession();
      if (!stored) {
        setCheckedStoredSession(true);
        return;
      }
      request<{ token: string }, ReconnectAck>('room:reconnect', { token: stored.token }).then((ack) => {
        if (ack.ok) {
          setSession(stored);
          setNotice('');
        } else {
          // The socket reconnected (e.g. the server restarted) but this session no
          // longer exists there - drop back to Home instead of showing a stale room.
          clearSession();
          setSession(null);
          setRoom(null);
          setGame(null);
          setNotice('Your room is no longer available. Start a new one.');
        }
        setCheckedStoredSession(true);
      });
    }

    // Runs on every (re)connect, not just mount, so a server restart or dropped
    // connection re-syncs this tab instead of leaving it on a stale room view.
    socket.on('connect', syncSession);
    if (socket.connected) syncSession();
    return () => {
      socket.off('connect', syncSession);
    };
  }, []);

  const handleEnter = useCallback((s: StoredSession) => {
    saveSession(s);
    setSession(s);
  }, []);

  let content: JSX.Element;
  if (!checkedStoredSession) {
    content = <div className="panel">Connecting...</div>;
  } else if (!session) {
    content = <Home onEnter={handleEnter} />;
  } else if (game) {
    // A game:view is authoritative on its own - don't gate on room:state, which a
    // tab reconnecting straight into an in-progress game may never have received.
    content = (
      <Game game={game} room={room} isHost={game.hostPlayerId === session.playerId} roomCode={game.roomCode} />
    );
  } else if (room && room.phase !== 'lobby') {
    content = <div className="panel">Loading game...</div>;
  } else if (room) {
    content = <Lobby room={room} myPlayerId={session.playerId} />;
  } else {
    content = <div className="panel">Joining room...</div>;
  }

  return (
    <>
      {notice && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <p className="error-text">{notice}</p>
        </div>
      )}
      {content}
    </>
  );
}
