import { useState } from 'react';
import { supportedPlayerCounts, teamOptionsFor } from '@rps/engine';
import { request } from '../socket';
import type { CreateRoomAck, JoinRoomAck } from '../protocol';
import type { StoredSession } from '../session';

const PLAYER_COUNTS = supportedPlayerCounts();

export function Home({ onEnter }: { onEnter: (session: StoredSession) => void }) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [playerCount, setPlayerCount] = useState(PLAYER_COUNTS[0]);
  const [teamCount, setTeamCount] = useState<2 | 3>(2);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const teamOptions = teamOptionsFor(playerCount);

  async function handleCreate() {
    if (!name.trim()) return setError('Enter a name');
    setBusy(true);
    setError('');
    const ack = await request<
      { playerCount: number; teamCount?: 2 | 3; name: string },
      CreateRoomAck
    >('room:create', {
      playerCount,
      teamCount: teamOptions.length > 1 ? teamCount : undefined,
      name: name.trim(),
    });
    setBusy(false);
    if (!ack.ok) return setError(ack.error);
    onEnter({ token: ack.token, code: ack.code, playerId: ack.playerId });
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter a name');
    if (!code.trim()) return setError('Enter a room code');
    setBusy(true);
    setError('');
    const ack = await request<{ code: string; name: string }, JoinRoomAck>('room:join', {
      code: code.trim(),
      name: name.trim(),
    });
    setBusy(false);
    if (!ack.ok) return setError(ack.error);
    onEnter({ token: ack.token, code: ack.code, playerId: ack.playerId });
  }

  return (
    <div className="panel">
      <h1>CrossWars</h1>
      <div className="tabs">
        <button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>
          Create room
        </button>
        <button className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>
          Join room
        </button>
      </div>

      <div className="field">
        <label>Your name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Ada" />
      </div>

      {tab === 'create' ? (
        <>
          <div className="field">
            <label>Players</label>
            <select
              value={playerCount}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPlayerCount(next);
                const opts = teamOptionsFor(next);
                setTeamCount(opts[0] ?? 2);
              }}
            >
              {PLAYER_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </select>
          </div>
          {teamOptions.length > 1 && (
            <div className="field">
              <label>Teams</label>
              <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value) as 2 | 3)}>
                {teamOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} teams
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="actions">
            <button onClick={handleCreate} disabled={busy}>
              Create room
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>Room code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABCD"
            />
          </div>
          <div className="actions">
            <button onClick={handleJoin} disabled={busy}>
              Join room
            </button>
          </div>
        </>
      )}
      <p className="error-text">{error}</p>
    </div>
  );
}
