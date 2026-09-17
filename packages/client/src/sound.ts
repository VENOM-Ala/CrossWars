const MUTE_KEY = 'crosswars:muted';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.05, delay = 0): void {
  if (isMuted()) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  const start = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export const sound = {
  place: () => beep(440, 0.1, 'triangle', 0.05),
  lock: () => beep(220, 0.22, 'square', 0.04),
  bomb: () => beep(90, 0.35, 'sawtooth', 0.08),
  win: () => {
    beep(523, 0.15, 'sine', 0.06);
    beep(659, 0.15, 'sine', 0.06, 0.12);
    beep(784, 0.3, 'sine', 0.06, 0.24);
  },
  draw: () => beep(150, 0.4, 'sine', 0.05),
};
