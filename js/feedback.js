// Beeps, buzzes and keeping the screen awake. Each one is optional and fails quietly.
import { settings } from './store.js';

let ctx = null;

// iOS only lets a page make sound after a tap, so every Start button calls this first.
export function unlockAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'transient';
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    // A silent blip finishes the unlock on older WebKit.
    const o = ctx.createOscillator(), g = ctx.createGain();
    g.gain.value = 0; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.01);
  } catch (e) { /* no audio here */ }
}

function tone(freq, start, dur, vol = 0.18) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

// kind: 'tick' (3-2-1 countdown), 'go' (rest over / new minute), 'done' (session finished)
export function beep(kind = 'go') {
  const s = settings();
  if (s.sound && ctx) {
    try {
      if (ctx.state === 'suspended') ctx.resume();
      if (kind === 'tick') tone(660, 0, 0.09, 0.12);
      else if (kind === 'done') { tone(660, 0, 0.12); tone(880, 0.16, 0.12); tone(1175, 0.32, 0.3); }
      else { tone(880, 0, 0.14); tone(880, 0.22, 0.14); tone(1175, 0.44, 0.32); }
    } catch (e) {}
  }
  if (s.vibrate) buzz(kind === 'tick' ? 30 : kind === 'done' ? [80, 60, 80, 60, 200] : [120, 80, 220]);
}

export function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

// A light tap of haptic feedback on iPhone: Safari 18 gives a haptic tick when a switch
// control is toggled through its label. Only works inside a real tap, which is when we call it.
let hapticLabel = null;
export function tap() {
  if (!settings().vibrate) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(10); return; }
    if (!hapticLabel) {
      hapticLabel = document.createElement('label');
      hapticLabel.setAttribute('aria-hidden', 'true');
      hapticLabel.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9px;top:-9px';
      const input = document.createElement('input');
      input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1;
      hapticLabel.appendChild(input);
      document.body.appendChild(hapticLabel);
    }
    hapticLabel.click();
  } catch (e) {}
}

// Keep the screen on during a session.
let lock = null, wanted = false;
export async function keepAwake(on) {
  wanted = on;
  try {
    if (on && !lock && navigator.wakeLock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { lock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wanted) keepAwake(true);
});
