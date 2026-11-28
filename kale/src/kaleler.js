// Atölyede kurulan kaleler: yeni kale, kareye parça koyma, denetleme, bağlantıya çevirme, örnekler.
// Saf mantık: DOM'a ve kayda dokunmaz.
import { parseProg, printProg, progFits, usedIn, countBlocks } from './bloklar.js';

export const W = 7, H = 8, MAX_ENTS = 10, MAX_NAME = 24;
const TERRAIN = '.#SHakd';
const KINDS = ['guard', 'door', 'spikes'];
const KIND_CH = { guard: 'g', door: 'd', spikes: 's' };
// İlk sürümde robotun yerinde canavar vardı: eski kayıtlar ve eski bağlantılar da açılsın.
const OLD_KIND = { monster: 'guard' }, OLD_CH = { m: 'guard' };
const ITEM_CH = { coin: 'a', key: 'k', plate: 'd' };

/** Yeni konan parçanın hazır programı: çocuk boş sayfayla değil, çalışan bir örnekle başlar. */
export function defaultProg(kind, open) {
  if (kind === 'guard') return open.blocks.has('forever') ? 'F(ffrr)' : open.blocks.has('repeat') ? 'R2(ffrr)' : 'ffb';
  if (kind === 'door') return open.blocks.has('on') && open.pieces.has('key') ? '@s()@k(o)' : 'F(owwcww)';
  return 'F(uwnw)';
}
const STARTERS = new Set(['F(ffrr)', 'R2(ffrr)', 'ffb']);

export function newCastle(id, name, open) {
  return {
    id, name, proven: false, shared: false,
    rows: ['S......', '.......', '..###..', '.......', '.......', '..###..', '.......', '......H'],
    ents: [{ kind: 'guard', x: 3, y: 4, dir: 1, on: false, prog: defaultProg('guard', open) }],
  };
}

const setCh = (rows, x, y, ch) => { rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1); };
const clearCh = (rows, ch) => rows.forEach((r, y) => { const x = r.indexOf(ch); if (x >= 0) setCh(rows, x, y, '.'); });

/**
 * Kareye bir parça koyar (kaleyi yerinde değiştirir). Dönen: { ok, ent, error }.
 * Araçlar: wall, erase, knight, chest, coin, key, plate, guard, door, spikes.
 */
export function paint(castle, tool, x, y, open) {
  const { rows, ents } = castle, at = rows[y][x], ei = ents.findIndex((e) => e.x === x && e.y === y);
  const fixed = at === 'S' || at === 'H';
  if (fixed && tool !== (at === 'S' ? 'knight' : 'chest')) return { ok: false, error: at === 'S' ? 'Şövalyeyi başka kareye taşı, sonra buraya koy.' : 'Hazineyi başka kareye taşı, sonra buraya koy.' };
  if (fixed) return { ok: false };
  if (tool === 'erase' && at === '.' && ei < 0) return { ok: false };
  if (tool === 'wall' && at === '#') return { ok: false };
  if (KINDS.includes(tool) && ei < 0 && ents.length >= MAX_ENTS) return { ok: false, error: `Bir kalede en çok ${MAX_ENTS} programlı parça olur.` };
  if (ei >= 0) ents.splice(ei, 1);
  let ent = null;
  if (tool === 'wall') setCh(rows, x, y, '#');
  else if (tool === 'erase') setCh(rows, x, y, '.');
  else if (tool === 'knight') { clearCh(rows, 'S'); setCh(rows, x, y, 'S'); }
  else if (tool === 'chest') { clearCh(rows, 'H'); setCh(rows, x, y, 'H'); }
  else if (ITEM_CH[tool]) setCh(rows, x, y, ITEM_CH[tool]);
  else if (KINDS.includes(tool)) {
    setCh(rows, x, y, '.');
    ent = { kind: tool, x, y, dir: 1, on: false, prog: defaultProg(tool, open) };
    ents.push(ent);
  } else return { ok: false };
  castle.proven = false;
  return { ok: true, ent };
}

/** Kaleyi denetler ve temiz bir kopyasını döndürür; bozuksa Türkçe bir hata fırlatır. */
export function checkCastle(c) {
  const bad = (m) => { throw new Error(m); };
  if (!c || typeof c !== 'object') bad('Kale okunamadı.');
  const rows = c.rows;
  if (!Array.isArray(rows) || rows.length < 3 || rows.length > 10) bad('Kalenin boyu tuhaf.');
  const w = typeof rows[0] === 'string' ? rows[0].length : 0;
  if (w < 3 || w > 9) bad('Kalenin eni tuhaf.');
  let knights = 0, chests = 0;
  for (const r of rows) {
    if (typeof r !== 'string' || r.length !== w) bad('Kalenin satırları eşit değil.');
    for (const ch of r) { if (!TERRAIN.includes(ch)) bad('Kalede tanınmayan bir kare var.'); if (ch === 'S') knights++; if (ch === 'H') chests++; }
  }
  if (knights !== 1 || chests !== 1) bad('Kalede bir şövalye ve bir hazine olmalı.');
  const list = Array.isArray(c.ents) ? c.ents : bad('Kale okunamadı.');
  if (list.length > MAX_ENTS + 2) bad('Kalede çok fazla parça var.');
  const taken = new Set();
  const ents = list.map((e) => {
    const kind = e && (OLD_KIND[e.kind] || e.kind);
    if (!KINDS.includes(kind)) bad('Kalede tanınmayan bir parça var.');
    const x = e.x | 0, y = e.y | 0;
    if (x !== e.x || y !== e.y || x < 0 || y < 0 || x >= w || y >= rows.length || rows[y][x] !== '.' || taken.has(`${x},${y}`)) bad('Bir parça yanlış karede duruyor.');
    taken.add(`${x},${y}`);
    let prog;
    try { prog = parseProg(typeof e.prog === 'string' ? e.prog : ''); } catch (err) { bad('Bir parçanın programı okunamadı.'); }
    if (!progFits(prog, kind)) bad('Bir parçanın programında ona uymayan blok var.');
    return { kind, x, y, dir: [0, 1, 2, 3].includes(e.dir) ? e.dir : 1, on: !!e.on, prog: printProg(prog) };
  });
  // Ad düz metindir; ekrana yalnız textContent ile yazılır.
  const name = String(c.name ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, MAX_NAME) || 'Adsız kale';
  return { name, rows: [...rows], ents };
}

const toB64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (text) => new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)));

/** Kale → bağlantıya konacak kısa metin. */
export function encodeCastle(castle) {
  const c = checkCastle(castle);
  return toB64(JSON.stringify({ v: 1, n: c.name, r: c.rows.join('/'), e: c.ents.map((e) => [KIND_CH[e.kind], e.x, e.y, e.dir, e.on ? 1 : 0, e.prog]) }));
}

/** Bağlantıdaki metin → kale. Güvenilmeyen girdi: her alan denetlenir. */
export function decodeCastle(text) {
  let raw;
  try { raw = JSON.parse(fromB64(String(text).slice(0, 6000))); } catch (err) { throw new Error('Bağlantı bozuk: kale okunamadı.'); }
  if (!raw || raw.v !== 1 || typeof raw.r !== 'string' || !Array.isArray(raw.e)) throw new Error('Bağlantı bozuk: kale okunamadı.');
  const kind = { ...OLD_CH, g: 'guard', d: 'door', s: 'spikes' };
  return checkCastle({
    name: raw.n, rows: raw.r.split('/'),
    ents: raw.e.map((e) => (Array.isArray(e) ? { kind: kind[e[0]], x: e[1], y: e[2], dir: e[3], on: !!e[4], prog: e[5] } : null)),
  });
}

/** "Usta işi": atölyenin uzun soluklu hedefi. Bulmaca çözmekle değil, kale kurmakla tamamlanır. */
export function masterChecks(castles) {
  const progs = castles.flatMap((c) => c.ents.map((e) => ({ kind: e.kind, text: e.prog, prog: parseProg(e.prog) })));
  const loops = progs.some((p) => { const u = usedIn(p.prog).blocks; return p.kind === 'guard' && !STARTERS.has(p.text) && (u.has('repeat') || u.has('forever')); });
  const events = progs.some((p) => p.prog.some((h) => h.e !== 'start' && countBlocks([h]) > 0) && p.text !== '@s()@k(o)');
  return [
    { id: 'loop', text: 'Bir robota kendi döngülü programını yaz', done: loops },
    { id: 'event', text: 'Bir parçayı bir olaya bağla («olunca» bloğu)', done: events, lesson: 10 },
    { id: 'proven', text: 'Kendi kaleni bir kez bitir', done: castles.some((c) => c.proven) },
    { id: 'shared', text: 'Kaleni birine oynat', done: castles.some((c) => c.shared) },
  ];
}

/** Hazır kaleler: önce oynanır, sonra kopyalanıp değiştirilir. */
export const SAMPLES = [
  {
    name: 'Bekçili Geçit', lesson: 3,
    note: 'Bekçilerin ne zaman nerede olacağını izle; doğru anda geç.',
    rows: ['...S...', '.......', '###.###', '.......', 'a.....a', '###.###', '.......', '###H###'],
    ents: [
      { kind: 'guard', x: 0, y: 3, dir: 1, on: false, prog: 'F(R6(f)rr)' },
      { kind: 'guard', x: 6, y: 6, dir: 3, on: false, prog: 'F(R6(f)rr)' },
      { kind: 'spikes', x: 3, y: 5, dir: 1, on: false, prog: 'F(uwnw)' },
    ],
  },
  {
    name: 'Alarmlı Hazine', lesson: 10,
    note: 'Anahtar kapıyı açar. Gözcü seni görürse alarm çalar, kapı kapanır; düğme yeniden açar.',
    rows: ['S.....d', '.####..', '.#k.#..', '.#.##..', '.......', '###.###', '###.###', '###H###'],
    ents: [
      { kind: 'guard', x: 6, y: 4, dir: 3, on: false, prog: '@s(F(wwwrrwwwrr))@e(a)' },
      { kind: 'door', x: 3, y: 6, dir: 1, on: false, prog: '@s()@k(o)@a(c)@p(o)' },
    ],
  },
];
