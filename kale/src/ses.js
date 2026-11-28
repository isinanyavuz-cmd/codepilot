// Ses efektleri: dosya yok, hepsi Web Audio ile üretilir. Ses ilk dokunuştan sonra açılır.
let ctx = null, enabled = true;

export const setSound = (on) => { enabled = !!on; };

function tone(freq, at, dur, { type = 'triangle', vol = 0.07, to = 0 } = {}) {
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at); osc.stop(at + dur + 0.02);
}

const SOUNDS = {
  tap: (t) => tone(620, t, 0.05, { vol: 0.04 }),
  step: (t) => tone(210, t, 0.06, { type: 'sine', vol: 0.05, to: 150 }),
  bump: (t) => tone(120, t, 0.16, { type: 'square', vol: 0.06, to: 60 }),
  call: (t) => { tone(300, t, 0.16, { type: 'sawtooth', vol: 0.05, to: 520 }); tone(520, t + 0.15, 0.14, { type: 'sawtooth', vol: 0.045, to: 430 }); },
  alarm: (t) => { tone(880, t, 0.12, { type: 'square', vol: 0.05 }); tone(660, t + 0.14, 0.12, { type: 'square', vol: 0.05 }); },
  pick: (t) => { tone(880, t, 0.07); tone(1320, t + 0.07, 0.1); },
  door: (t) => tone(140, t, 0.12, { type: 'square', vol: 0.04, to: 220 }),
  catch: (t) => { tone(300, t, 0.1, { type: 'sawtooth' }); tone(160, t + 0.1, 0.25, { type: 'sawtooth', to: 70 }); },
  win: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.18)),
  fail: (t) => { tone(330, t, 0.15, { to: 250 }); tone(220, t + 0.16, 0.25, { to: 150 }); },
};

export function sfx(name) {
  if (!enabled || !SOUNDS[name]) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name](ctx.currentTime);
  } catch (err) { /* ses yoksa oyun sessiz sürer */ }
}

const ORDER = ['win', 'catch', 'alarm', 'call', 'bump', 'jam', 'pick', 'door', 'spikes', 'plate', 'flag', 'move', 'turn'];
const MAP = { jam: 'bump', spikes: 'door', plate: 'tap', flag: 'pick', move: 'step', turn: 'tap' };
/** Bir turda olanlardan en önemlisinin sesini çalar (hepsi birden çalınca gürültü olur). */
export function sfxFor(fx) {
  const hit = ORDER.find((t) => fx.some((f) => f.t === t));
  if (hit) sfx(MAP[hit] || hit);
}
