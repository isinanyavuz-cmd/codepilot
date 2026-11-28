// Canavar Kalesi (kale/): motor, blok ağacı, dersler ve atölye kaleleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, initState, step, simulate, solve, sightCells } from '../kale/src/motor.js';
import { parseProg, printProg, cursors, moveNode, removeNode, insertAt, makeBlock, countBlocks, usedIn, unlocks, GIVES, toolsFor, findNode } from '../kale/src/bloklar.js';
import { LESSONS, runLesson, waveLevel, failText } from '../kale/src/dersler.js';
import { newCastle, paint, checkCastle, encodeCastle, decodeCastle, masterChecks, SAMPLES, W, H, MAX_ENTS } from '../kale/src/kaleler.js';

/** Kaleyi verilen hamlelerle oynatır; son durumu ve bütün olayları döndürür. */
function play(spec, moves) {
  const level = buildLevel(spec);
  let state = initState(level);
  const fx = [];
  for (const m of moves) { const r = step(level, state, m); state = r.state; fx.push(...r.fx); }
  return { level, state, fx };
}
const run = (spec, ticks) => play(spec, '.'.repeat(ticks));
const pos = (s, i = 0) => [s.ents[i].x, s.ents[i].y, s.ents[i].dir];

// ───────────────────────── motor ─────────────────────────

test('bloklar sırayla çalışır; her hareket bir tur sürer', () => {
  const spec = { rows: ['....', '....'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'ffrf' }] };
  assert.deepEqual(pos(run(spec, 1).state), [1, 0, 1]);
  assert.deepEqual(pos(run(spec, 3).state), [2, 0, 2]);
  assert.deepEqual(pos(run(spec, 4).state), [2, 1, 2]);
  assert.deepEqual(pos(run(spec, 9).state), [2, 1, 2], 'program bitince canavar yerinde durur');
});

test('duvara, kale dışına ve hazineye toslayan canavar yerinde kalır', () => {
  const r = run({ rows: ['.#', 'H.'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'frflf' }] }, 5);
  assert.deepEqual(pos(r.state), [0, 0, 1]);
  assert.equal(r.state.bumps, 3);
  assert.equal(r.fx.filter((f) => f.t === 'bump').length, 3);
});

test('tekrarla sayısı kadar, sürekli tekrarla hiç durmadan döner', () => {
  const lane = { rows: ['.......'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'R3(f)' }] };
  assert.deepEqual(pos(run(lane, 10).state), [3, 0, 1]);
  const patrol = { rows: ['...'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'F(ffrr)' }] };
  assert.deepEqual(pos(run(patrol, 4).state), [2, 0, 3]);
  assert.deepEqual(pos(run(patrol, 8).state), [0, 0, 1]);
  assert.deepEqual(pos(run(patrol, 8 * 5 + 2).state), [2, 0, 1]);
});

test('hareketsiz dönen sürekli döngü turu bekleyerek geçirir, oyunu kilitlemez', () => {
  for (const prog of ['F()', 'F(Ie(d)())', 'F(R9(R9(R9())))', 'R9(R9(R9(R9())))f']) {
    const r = run({ rows: ['...'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog }] }, 3);
    assert.equal(r.state.t, 3, prog);
  }
  assert.deepEqual(pos(run({ rows: ['...'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'R9(R9(R9()))f' }] }, 4).state), [1, 0, 1]);
});

test('eğer / değilse önüne bakar: kapalıysa döner, açıksa yürür', () => {
  const r = run({ rows: ['...#', '....'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'F(Iw(r)(f))' }] }, 4);
  assert.deepEqual(pos(r.state), [2, 1, 2]);
});

test('şövalye yürür, duvara toslar, altın ve anahtar toplar, hazineye varınca kazanır', () => {
  const spec = { rows: ['Sak#', '...H'], ents: [] };
  const a = play(spec, 'RRR');
  assert.deepEqual([a.state.knight.x, a.state.knight.coins, a.state.knight.keys], [2, 1, 1]);
  assert.equal(a.fx.filter((f) => f.t === 'bump').length, 1);
  const b = play(spec, 'RRDR');
  assert.equal(b.state.status, 'won');
  assert.equal(play(spec, 'RRDRLL').state.t, 4, 'oyun bitince tur ilerlemez');
});

test('canavar şövalyenin üstüne yürürse ya da şövalye ona çarparsa yakalanır', () => {
  const walkIn = play({ rows: ['S.H'], ents: [{ kind: 'monster', x: 1, y: 0, dir: 1, prog: '' }] }, 'R');
  assert.equal(walkIn.state.status, 'caught');
  const chase = play({ rows: ['S...H'], ents: [{ kind: 'monster', x: 3, y: 0, dir: 3, prog: 'd' }] }, 'R');
  assert.deepEqual([chase.state.status, chase.state.by], ['caught', 0]);
  const miss = play({ rows: ['S....', '....H'], ents: [{ kind: 'monster', x: 4, y: 0, dir: 3, prog: 'f' }] }, 'D');
  assert.equal(miss.state.status, 'play');
});

test('görüş düz bir çizgidir; duvar ve kapalı kapı keser', () => {
  const level = buildLevel({ rows: ['....#.'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: '' }, { kind: 'door', x: 2, y: 0, on: false, prog: '' }] });
  assert.equal(sightCells(level, initState(level), 0).length, 1);
  const open = buildLevel({ rows: ['....#.'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: '' }, { kind: 'door', x: 2, y: 0, on: true, prog: '' }] });
  assert.equal(sightCells(open, initState(open), 0).length, 3);
});

test('"görünce" olayı görmeye başladığı an bir kez çalışır, işi yarıda keser, sonra kalınan yerden sürer', () => {
  // Canavar sağa bakarak yerinde dönüp duruyor; şövalye çizgisine girince iki kez kükrer, sonra dönmeye devam eder.
  const spec = { rows: ['.....', '....S'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: '@s(F(w))@e(bb)' }] };
  const r = play(spec, '.U...');
  assert.deepEqual(r.fx.filter((f) => f.t === 'roar').length, 2);
  const again = play(spec, '.U..D.U..');
  assert.equal(again.fx.filter((f) => f.t === 'roar').length, 4, 'çizgiden çıkıp yeniden girince olay bir daha çalışır');
});

test('olaylar bir sonraki canavar turunda duyulur: altın, anahtar, düğme, alarm', () => {
  const spec = {
    rows: ['Sakd...'],
    ents: [
      { kind: 'door', x: 5, y: 0, on: false, prog: '@s()@c(o)@k(c)@p(o)' },
      { kind: 'monster', x: 6, y: 0, dir: 0, prog: '@s()@p(a)@a(b)' },
    ],
  };
  const doorOn = (moves) => play(spec, moves).state.ents[0].on;
  assert.equal(doorOn('R'), true, 'altın alınınca açıl');
  assert.equal(doorOn('RR'), false, 'anahtar alınınca kapan');
  assert.equal(doorOn('RRR'), true, 'düğmeye basılınca açıl');
  assert.equal(play(spec, 'RRR').fx.some((f) => f.t === 'alarm'), true);
  assert.equal(play(spec, 'RRR').fx.some((f) => f.t === 'roar'), false, 'alarm aynı turda duyulmaz');
  assert.equal(play(spec, 'RRR.').fx.some((f) => f.t === 'roar'), true);
});

test('kapı: kapalıyken geçilmez, arasında biri varken kapanmaz; canavar da düğmeye basar', () => {
  const shut = play({ rows: ['S..H'], ents: [{ kind: 'door', x: 1, y: 0, on: false, prog: '' }] }, 'RR');
  assert.equal(shut.state.knight.x, 0);
  const jam = play({ rows: ['S..H'], ents: [{ kind: 'door', x: 1, y: 0, on: true, prog: 'c' }] }, 'R.');
  assert.equal(jam.state.ents[0].on, true);
  assert.equal(jam.fx.some((f) => f.t === 'jam'), true);
  const plate = run({ rows: ['.d..'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'f' }, { kind: 'door', x: 3, y: 0, on: false, prog: '@s()@p(o)' }] }, 2);
  assert.equal(plate.state.ents[1].on, true);
});

test('diken: yukarıdayken basan da, üstündeyken çıkan dikene yakalanan da yanar; canavara işlemez', () => {
  const up = play({ rows: ['S.H'], ents: [{ kind: 'spikes', x: 1, y: 0, on: true, prog: '' }] }, 'R');
  assert.equal(up.state.status, 'caught');
  const rising = play({ rows: ['S.H'], ents: [{ kind: 'spikes', x: 1, y: 0, on: false, prog: 'wu' }] }, '.R');
  assert.equal(rising.state.status, 'caught');
  const safe = play({ rows: ['S.H'], ents: [{ kind: 'spikes', x: 1, y: 0, on: true, prog: 'nwwu' }] }, '.RR');
  assert.equal(safe.state.status, 'won');
  const beast = run({ rows: ['...'], ents: [{ kind: 'monster', x: 0, y: 0, dir: 1, prog: 'ff' }, { kind: 'spikes', x: 1, y: 0, on: true, prog: '' }] }, 2);
  assert.deepEqual(pos(beast.state), [2, 0, 1]);
});

test('türüne uymayan blok atlanır (elle kurcalanmış program oyunu bozmaz)', () => {
  const r = run({ rows: ['...'], ents: [{ kind: 'door', x: 0, y: 0, on: false, prog: 'ffo' }] }, 1);
  assert.equal(r.state.ents[0].on, true);
  assert.deepEqual([r.state.ents[0].x, r.state.ents[0].y], [0, 0]);
});

test('step saftır: verilen durumu değiştirmez', () => {
  const level = buildLevel({ rows: ['S..H'], ents: [{ kind: 'monster', x: 2, y: 0, dir: 3, prog: 'F(w)' }] });
  const s0 = initState(level), copy = JSON.stringify(s0);
  step(level, s0, 'R');
  assert.equal(JSON.stringify(s0), copy);
});

// ───────────────────────── blok ağacı ─────────────────────────

test('kısa yazım: okunan program yeniden yazılınca aynı çıkar', () => {
  for (const text of ['', 'f', 'ffrff', 'R6(f)', 'F(ffrr)', 'F(Iw(r)(f))', 'R2(flfr)f', '@s()@c(c)', '@s(F(ffrr))@e(dd)@a(b)', 'F(owwcww)', 'R3(R2(f)l)']) {
    assert.equal(printProg(parseProg(text)), text);
  }
  assert.equal(printProg(parseProg('@c(c)')), '@s()@c(c)', '"başlayınca" şapkası hep vardır ve en üsttedir');
  assert.equal(printProg(parseProg('@c(c)@c(o)')), '@s()@c(c)', 'aynı olay iki kez yazılmışsa ilki kalır');
});

test('kısa yazım: bozuk metin hata verir, sonsuz derinlik ve uzunluk kabul edilmez', () => {
  for (const bad of ['x', 'R(f)', 'R0(f)', 'F(f', 'f)', 'Iq(f)(f)', 'Iw(f)', '@z(f)', '@s(f', 'F('.repeat(9) + ')'.repeat(9), 'f'.repeat(200)]) {
    assert.throws(() => parseProg(bad), /Program okunamadı/, bad);
  }
});

test('imleç sırası okuma sırasıdır; "aşağı taşı" bloğu döngünün içine sokar, sonundan çıkarır', () => {
  const prog = parseProg('fR2(l)r');
  assert.equal(cursors(prog).length, 6);
  const f = prog[0].b[0].id;
  const steps = [];
  for (let i = 0; i < 6; i++) { steps.push(printProg(prog)); if (!moveNode(prog, f, 1)) break; }
  assert.deepEqual(steps, ['fR2(l)r', 'R2(fl)r', 'R2(lf)r', 'R2(l)fr', 'R2(l)rf']);
  assert.equal(moveNode(prog, f, 1), false, 'en sonda aşağı gidilmez');
  for (let i = 0; i < 4; i++) moveNode(prog, f, -1);
  assert.equal(printProg(prog), 'fR2(l)r');
  assert.equal(moveNode(prog, f, -1), false, 'en başta yukarı gidilmez');
});

test('blok eğer bloğunun iki dalına ve başka şapkaya da taşınır', () => {
  const prog = parseProg('@s(Iw()()f)@c()');
  const f = prog[0].b[1].id;
  const seen = [printProg(prog)];
  while (moveNode(prog, f, -1)) seen.push(printProg(prog));
  assert.deepEqual(seen, ['@s(Iw()()f)@c()', '@s(Iw()(f))@c()', '@s(Iw(f)())@c()', '@s(fIw()())@c()']);
  for (let i = 0; i < 4; i++) moveNode(prog, f, 1);
  assert.equal(printProg(prog), '@s(Iw()())@c(f)');
});

test('ekleme, silme ve sayma', () => {
  const prog = parseProg('ff');
  const loop = makeBlock('repeat', { n: 3 });
  insertAt(prog, { owner: prog[0].id, br: 'b', i: 1 }, loop);
  insertAt(prog, { owner: loop.id, br: 'b', i: 0 }, makeBlock('left'));
  assert.equal(printProg(prog), 'fR3(l)f');
  assert.equal(countBlocks(prog), 4);
  assert.deepEqual(removeNode(prog, loop.id), { owner: prog[0].id, br: 'b', i: 1 });
  assert.equal(printProg(prog), 'ff');
  assert.equal(removeNode(prog, prog[0].id), null, '"başlayınca" şapkası silinmez');
  const two = parseProg('@s(f)@c(b)');
  removeNode(two, two[1].id);
  assert.equal(printProg(two), 'f');
  assert.equal(findNode(two, 'yok'), null);
});

// ───────────────────────── dersler ─────────────────────────

const starts = (l) => l.parts.map((p) => p.start);

test('her dersin örnek çözümü bütün denemelerde tutar', () => {
  for (const l of LESSONS) {
    const res = runLesson(l, l.solution);
    assert.equal(res.ok, true, `${l.id}. ders: ${res.why}`);
    assert.equal(res.runs.length, l.waves.length);
    for (const run of res.runs) assert.ok(run.frames.length < 60, `${l.id}. ders çok uzun sürüyor`);
  }
});

test('hazır gelen program işi çocuğa bırakır; olmayınca söylenecek bir cümle vardır', () => {
  for (const l of LESSONS.filter((x) => x.type !== 'tahmin')) {
    const res = runLesson(l, starts(l));
    assert.equal(res.ok, false, `${l.id}. ders hazır programla geçiliyor`);
    assert.notEqual(failText(l, res), 'Olmadı. Bir daha dene.', `${l.id}. ders: "${res.why}" için cümle yok`);
  }
});

test('çözüm o dersin paletiyle ve çantasıyla yazılabilir', () => {
  for (const l of LESSONS) {
    l.parts.forEach((part, i) => {
      if (part.lock) return;
      const prog = parseProg(l.solution[i]), used = usedIn(prog);
      for (const b of used.blocks) assert.ok(part.tools.blocks.includes(b), `${l.id}. ders: palette "${b}" yok`);
      for (const c of used.conds) assert.ok((part.tools.conds || []).includes(c), `${l.id}. ders: "${c}" koşulu yok`);
      for (const e of used.events) assert.ok(e === 'start' || (part.tools.events || []).includes(e), `${l.id}. ders: "${e}" olayı yok`);
      if (part.cap) assert.ok(countBlocks(prog) <= part.cap, `${l.id}. ders: çözüm çantaya sığmıyor`);
    });
  }
});

test('ders alanları tutarlı: her denemede aynı parçalar, her parçaya bir program', () => {
  for (const l of LESSONS) {
    assert.ok(l.text.length <= 100, `${l.id}. dersin metni uzun`);
    assert.ok(l.hints.length >= 2);
    assert.equal(l.solution.length, l.parts.length);
    for (const w of l.waves) {
      assert.equal(w.ents.length, l.parts.length);
      assert.deepEqual(w.ents.map((e) => e.kind), l.waves[0].ents.map((e) => e.kind));
      assert.ok(w.rows[0].length <= 7 && w.rows.length <= 5, `${l.id}. dersin alanı telefona büyük`);
      assert.ok(w.rows.every((r) => r.length === w.rows[0].length));
    }
  }
  assert.deepEqual(LESSONS.map((l) => l.id), LESSONS.map((_, i) => i + 1));
});

test('olmayınca söylenen cümle büyük harfle başlar ve hangi denemede olduğunu söyler', () => {
  assert.equal(failText(LESSONS[2], runLesson(LESSONS[2], starts(LESSONS[2]))), 'Güm! Canavar tosladı ve bayrağa varamadı.');
  assert.equal(failText(LESSONS[1], runLesson(LESSONS[1], ['f'])), 'Canavar bayrağa varmadan durdu.');
  assert.equal(failText(LESSONS[4], runLesson(LESSONS[4], ['ff'])), 'Canavar durdu ama 3 bayrak kaldı.');
  assert.equal(failText(LESSONS[7], runLesson(LESSONS[7], ['fffrffrff'])), 'Güm! 2. denemede canavar tosladı ve bayrağa varamadı.');
  assert.equal(failText(LESSONS[8], runLesson(LESSONS[8], ['rd'])), '2. denemede şövalye kaçtı!');
  assert.equal(failText(LESSONS[9], runLesson(LESSONS[9], ['c'])), '1. denemede kapı erken kapandı: şövalye içeri giremedi.');
  assert.equal(failText(LESSONS[0], runLesson(LESSONS[0], [''])), 'Program boş: önce birkaç blok ekle.');
});

test('3. ders tek bloğu değiştirince düzelir', () => {
  const l = LESSONS[2], a = l.parts[0].start, b = l.solution[0];
  assert.equal(a.length, b.length);
  assert.equal([...a].filter((ch, i) => ch !== b[i]).length, 1);
});

test('çanta sınırı olan dersler döngüsüz geçilemez', () => {
  for (const l of LESSONS.filter((x) => x.parts[0].cap)) {
    const ticks = runLesson(l, l.solution).runs[0].frames.length - 1;
    assert.ok(ticks > l.parts[0].cap, `${l.id}. ders ${ticks} hareket istiyor, çanta ${l.parts[0].cap}`);
    assert.ok(usedIn(parseProg(l.solution[0])).blocks.has('repeat') || usedIn(parseProg(l.solution[0])).blocks.has('forever'));
  }
});

test('7. ders: iki başlangıcın cevabı ayrıdır, tahtanın içindedir ve yolda toslama yoktur', () => {
  const l = LESSONS[6], res = runLesson(l, l.solution);
  assert.equal(res.runs.length, 2);
  assert.deepEqual(res.runs.map((r) => r.end), [{ x: 3, y: 0 }, { x: 1, y: 2 }]);
  res.runs.forEach((r, i) => {
    assert.notDeepEqual(r.end, { x: l.waves[i].ents[0].x, y: l.waves[i].ents[0].y });
    assert.equal(r.state.bumps, 0, 'ilk tahmin dersinde toslama olmasın');
    assert.ok(r.frames.length > 8, 'cevap bir bakışta görülmesin');
  });
});

test('8. ders: bir koridoru ezberleyen ya da hep aynı şeyi yapan program öteki denemede kalır', () => {
  const l = LESSONS[7];
  assert.equal(runLesson(l, ['fffrffrff']).wave, 1);
  for (const bad of ['frfffrf', 'F(f)', 'F(r)', 'F(Iw(l)(f))', 'F(Iw(f)(r))']) assert.equal(runLesson(l, [bad]).ok, false, bad);
});

test('9. ders: gözcü görmeden yakalayamaz; iki dönüş yönü de tutar', () => {
  const l = LESSONS[8];
  for (const good of ['F(Ie(d)(r))', 'F(Ie(d)(l))', 'F(Ie(f)(r))']) assert.equal(runLesson(l, [good]).ok, true, good);
  for (const bad of ['', 'F(r)', 'F(d)', 'rd', 'rrrd', 'F(dr)', 'F(rd)', 'F(drr)', 'F(Iw(r)(f))', 'F(Iw(r)(d))']) assert.equal(runLesson(l, [bad]).ok, false, bad);
});

test('10. ders: saymak işe yaramaz, kapı ancak olaya bağlanınca şövalyeyi içeride tutar', () => {
  const l = LESSONS[9];
  for (let t = 1; t <= 20; t++) assert.equal(runLesson(l, [`${'w'.repeat(t - 1)}c`]).ok, false, `${t}. turda kapanan kapı`);
  assert.equal(runLesson(l, ['c']).why, 'early');
  assert.equal(runLesson(l, ['']).why, 'open');
});

test('11. ders: gözcü de kapı da gerekir; kapıyı saymak işe yaramaz', () => {
  const l = LESSONS[10];
  assert.equal(runLesson(l, ['@s()@e(a)', '']).ok, false);
  assert.equal(runLesson(l, ['', '@s()@a(c)']).ok, false);
  for (let t = 1; t <= 20; t++) assert.equal(runLesson(l, ['@s()@e(a)', `${'w'.repeat(t - 1)}c`]).ok, false, `${t}. turda kapanan kapı`);
});

test('dersler atölyeyi adım adım açar; bir dersin çözümündeki her şey o dersten sonra atölyede vardır', () => {
  assert.equal(unlocks([]).workshop, false);
  assert.equal(unlocks([1, 2]).workshop, false);
  assert.equal(unlocks([1, 2, 3]).workshop, true);
  for (const l of LESSONS.filter((x) => x.id >= 3)) {
    assert.ok(GIVES[l.id], `${l.id}. ders atölyeye bir şey açmıyor`);
    const open = unlocks(LESSONS.filter((x) => x.id <= l.id).map((x) => x.id));
    l.solution.forEach((text, i) => {
      const used = usedIn(parseProg(text)), kind = l.waves[0].ents[i].kind, tools = toolsFor(kind, open);
      for (const b of used.blocks) assert.ok(tools.blocks.includes(b), `${l.id}. dersten sonra atölyede "${b}" yok`);
    });
  }
  const all = unlocks('all');
  assert.deepEqual([...all.pieces].sort(), ['chest', 'coin', 'door', 'key', 'knight', 'monster', 'plate', 'spikes', 'wall']);
  assert.deepEqual(toolsFor('monster', all).blocks, ['fwd', 'left', 'right', 'dash', 'wait', 'roar', 'alarm', 'repeat', 'forever', 'if', 'on']);
  assert.deepEqual(toolsFor('door', unlocks([1, 2, 3, 4, 5, 6, 7])).blocks, ['open', 'close', 'wait', 'repeat', 'forever']);
});

test('waveLevel dersin parça adlarını ve programlarını kaleye taşır', () => {
  const level = waveLevel(LESSONS[10], 0, LESSONS[10].solution);
  assert.deepEqual(level.ents.map((e) => e.name), ['Gözcü', 'Kapı']);
  assert.ok(level.ents[0].prog.byEvent.see);
});

// ───────────────────────── atölye ─────────────────────────

const ALL = unlocks('all');

test('yeni kale geçerlidir ve hemen oynanabilir', () => {
  for (const open of [unlocks([1, 2, 3]), ALL]) {
    const c = newCastle('k1', 'Kale 1', open);
    assert.deepEqual([c.rows[0].length, c.rows.length], [W, H]);
    assert.doesNotThrow(() => checkCastle(c));
    assert.ok(solve(buildLevel(c)), 'yeni kale çözülebilir olmalı');
  }
});

test('kareye parça koymak: şövalye ve hazine tektir, üstlerine bir şey konmaz', () => {
  const c = newCastle('k1', 'Kale 1', ALL);
  c.proven = true;
  assert.equal(paint(c, 'wall', 1, 1, ALL).ok, true);
  assert.equal(c.proven, false, 'değişen kalenin kanıtı düşer');
  assert.equal(paint(c, 'wall', 1, 1, ALL).ok, false, 'zaten duvar');
  assert.equal(paint(c, 'wall', 0, 0, ALL).ok, false);
  assert.match(paint(c, 'coin', 6, 7, ALL).error, /Hazine/);
  assert.equal(paint(c, 'knight', 1, 1, ALL).ok, true);
  assert.equal(c.rows.join('').split('S').length - 1, 1);
  assert.equal(c.rows[0][0], '.');
  assert.equal(paint(c, 'chest', 3, 4, ALL).ok, true, 'hazine canavarın karesine taşınınca canavar kalkar');
  assert.equal(c.ents.length, 0);
  assert.equal(paint(c, 'erase', 5, 5, ALL).ok, false, 'boş kare silinmez');
  const door = paint(c, 'door', 5, 5, ALL);
  assert.equal(door.ent.kind, 'door');
  assert.equal(paint(c, 'spikes', 5, 5, ALL).ok, true);
  assert.deepEqual(c.ents.map((e) => e.kind), ['spikes'], 'aynı kareye konan parça eskisinin yerine geçer');
  assert.doesNotThrow(() => checkCastle(c));
});

test('bir kalede en çok on programlı parça olur', () => {
  const c = newCastle('k1', 'Kale 1', ALL);
  let placed = c.ents.length;
  for (let x = 0; x < W && placed < MAX_ENTS; x++) for (let y = 1; y < 3 && placed < MAX_ENTS; y++) { if (paint(c, 'monster', x, y, ALL).ok) placed++; }
  assert.equal(c.ents.length, MAX_ENTS);
  assert.match(paint(c, 'monster', 6, 3, ALL).error, /en çok/);
  assert.equal(paint(c, 'door', c.ents[0].x, c.ents[0].y, ALL).ok, true, 'var olan parçanın yerine yenisi konabilir');
});

test('kale bağlantıya çevrilir ve geri okunur; Türkçe adlar bozulmaz', () => {
  const c = newCastle('k1', 'Çağrı\'nın Şatosu ğüşiöç', ALL);
  paint(c, 'door', 3, 3, ALL); paint(c, 'key', 0, 7, ALL); paint(c, 'spikes', 5, 0, ALL);
  c.ents[0].prog = '@s(F(Iw(r)(f)))@e(dd)@a(b)';
  const text = encodeCastle(c);
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  assert.ok(text.length < 700, `bağlantı uzun: ${text.length}`);
  const back = decodeCastle(text);
  assert.deepEqual(back, checkCastle(c));
  assert.equal(back.name, 'Çağrı\'nın Şatosu ğüşiöç');
});

test('bozuk ya da kurcalanmış bağlantı geri çevrilir', () => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const good = { v: 1, n: 'x', r: 'S..../...../...H.', e: [['m', 1, 1, 1, 0, 'f']] };
  assert.doesNotThrow(() => decodeCastle(enc(good)));
  const cases = [
    'saçma', '', enc({}), enc({ ...good, v: 2 }), enc({ ...good, r: 'S.../...' }), enc({ ...good, r: 'S..../...../..HH.' }),
    enc({ ...good, r: 'S..../..<../...H.' }), enc({ ...good, e: [['q', 1, 1, 1, 0, 'f']] }), enc({ ...good, e: [['m', 9, 1, 1, 0, 'f']] }),
    enc({ ...good, e: [['m', 0, 0, 1, 0, 'f']] }), enc({ ...good, e: [['m', 1, 1, 1, 0, 'f'], ['d', 1, 1, 1, 0, '']] }),
    enc({ ...good, e: [['m', 1, 1, 1, 0, 'f((']] }), enc({ ...good, e: [['d', 1, 1, 1, 0, 'ff']] }), enc({ ...good, e: [['d', 1, 1, 1, 0, '@e(o)']] }),
    enc({ ...good, e: Array(20).fill(['m', 1, 1, 1, 0, 'f']) }), enc({ ...good, e: [null] }), enc({ ...good, e: [['m', 1.5, 1, 1, 0, 'f']] }),
  ];
  for (const text of cases) assert.throws(() => decodeCastle(text), Error, text.slice(0, 30));
  const named = decodeCastle(enc({ ...good, n: '<img src=x onerror=alert(1)>'.repeat(3) }));
  assert.ok(!/[<>]/.test(named.name) && named.name.length <= 24);
  assert.equal(decodeCastle(enc({ ...good, n: 5 })).name, '5');
  assert.equal(decodeCastle(enc({ ...good, n: '' })).name, 'Adsız kale');
});

test('usta işi: hazır gelen program sayılmaz, çocuğun yazdığı sayılır', () => {
  const c = newCastle('k1', 'Kale 1', ALL);
  const done = () => masterChecks([c]).filter((x) => x.done).map((x) => x.id);
  assert.deepEqual(done(), []);
  c.ents[0].prog = 'F(fffrr)';
  assert.deepEqual(done(), ['loop']);
  paint(c, 'door', 1, 1, ALL);
  assert.deepEqual(done(), ['loop'], 'kapının hazır programı sayılmaz');
  c.ents[1].prog = '@s()@p(c)';
  c.proven = true; c.shared = true;
  assert.deepEqual(done(), ['loop', 'event', 'proven', 'shared']);
  assert.deepEqual(masterChecks([]).map((x) => x.done), [false, false, false, false]);
});

test('örnek kaleler geçerlidir, çözülebilir, ama dümdüz yürüyen yakalanır', () => {
  for (const s of SAMPLES) {
    assert.doesNotThrow(() => checkCastle(s), s.name);
    assert.deepEqual([s.rows[0].length, s.rows.length], [W, H]);
    const level = buildLevel(s), moves = solve(level);
    assert.ok(moves, `${s.name} çözülemiyor`);
    assert.ok(moves.length >= 8 && moves.length <= 45, `${s.name}: ${moves.length} hamle`);
    const still = buildLevel({ ...s, ents: [] }), direct = solve(still);
    assert.notEqual(play(s, direct).state.status, 'won', `${s.name}: beklemeden yürüyen kazanıyor`);
    assert.ok(moves.length > direct.length, `${s.name}: bekçiler hiç oyalamıyor`);
  }
});
