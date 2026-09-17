import { useState } from 'react';
import { isMuted, setMuted } from '../sound';

export function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted);

  function toggle() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <button className="secondary sound-toggle" onClick={toggle} title={muted ? 'Unmute' : 'Mute'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
