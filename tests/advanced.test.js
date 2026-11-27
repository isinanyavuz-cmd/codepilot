import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseField, simulate, sense, stars, ENERGY_MAX } from '../src/engine/world.js';
import { F, L, R, rep, forever, ifelse, until, on, shield, setEnergy, addEnergy, define, call, clone, count, find, remove, toPython, CONTAINERS, CONDS, create } from '../src/engine/blocks.js';
import { LEVELS, SECTORS, levelsOf, levelById } from '../src/content/levels.js';
import { EXTRAS } from '../src/content/extras.js';
import { route } from '../src/content/advanced.js';

const run = (lines, program) => simulate(parseField(lines), program);
const fly = (level, program) => level.waves.map((w) => simulate(parseField(w), program));
const wins = (level, program) => fly(level, program).every((r) => r.outcome === 'win');
const starsOf = (level, program) => stars(fly(level, program), count(program), level.par);
const advanced = LEVELS.filter((l) => l.sector >= 4);
const twoSensor = () => ifelse('ahead', [ifelse('rightFree', [R()], [L()])], [F()]);
const twoSensorLeft = () => ifelse('ahead', [ifelse('leftFree', [L()], [R()])], [F()]);
const isSteer = (b) => b.type === 'ifelse' && b.cond === 'ahead' && b.then[0]?.type === 'ifelse';
const hasSteer = (program) => program.some((b) => isSteer(b) || (CONTAINERS[b.type] || []).some((k) => hasSteer(b[k])));
/** Programdaki iki sensörlü karar ağacını (önümde meteor → sağım boş mu) başka bir ağaçla değiştirir. */
const swapSteer = (program, make) => program.map((b) => {
  if (isSteer(b)) return make();
  const c = { ...b };
  for (const k of CONTAINERS[b.type] || []) c[k] = swapSteer(b[k], make);
  return c;
});

test('sekiz sektör ve 64 görev tamam: ilk üç sektörün kimlikleri korunur', () => {
  assert.equal(SECTORS.length, 8);
  assert.equal(LEVELS.length, 64);
  assert.ok(SECTORS.every((s) => !s.soon && s.intro));
  for (const s of SECTORS) {
    assert.equal(levelsOf(s.id).length, 8);
    assert.equal(levelsOf(s.id)[0].id, `${s.id}-1`);
  }
  assert.equal(LEVELS[23].id, '3-8');
  assert.equal(LEVELS[24].id, '4-1');
});

test('eski ilerleme kaydı korunur ve üçüncü sektör finali yeni sektörü açar', async () => {
  const original = globalThis.localStorage;
  const saved = { stars: { '1-1': 3, '3-8': 2 }, programs: { '1-1': [F()] }, intros: { 3: true }, sound: false, speed: 2 };
  globalThis.localStorage = {
    getItem(key) { assert.equal(key, 'kodpilotu.v1'); return JSON.stringify(saved); },
    setItem() {},
  };
  try {
    const { store } = await import('../src/storage.js?legacy-progress-test');
    assert.equal(store.total(), 5);
    assert.deepEqual(store.program('1-1'), saved.programs['1-1']);
    assert.ok(store.introSeen(3));
    assert.equal(store.sound, false);
    assert.equal(store.speed, 2);
    assert.equal(store.isUnlocked(LEVELS[24], LEVELS), true);
    assert.equal(store.isUnlocked(LEVELS[25], LEVELS), false);
    store.setStars('4-1', 1);
    assert.equal(store.isUnlocked(LEVELS[25], LEVELS), true);
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});

test('yeni nesneler ayrıdır ve alan çizimi geçersiz başlangıcı reddeder', () => {
  const f = parseField(['.B.', '.P.', '.E.', '.S.']);
  assert.ok(f.beacons.has('1,3'));
  assert.ok(f.pirates.has('1,2'));
  assert.ok(f.energyCells.has('1,1'));
  assert.throws(() => parseField([]));
  assert.throws(() => parseField(['...', 'SS.']));
});

test('olana kadar işarette durur ve sonraki komuta geçer', () => {
  const result = run(['...', '.M.', '.BK', '...', '.S.'], [until('atBeacon', F()), R(), forever(F())]);
  assert.equal(result.outcome, 'win');
  assert.deepEqual(result.events.filter((e) => e.t === 'move').map((e) => e.kind), ['fwd', 'fwd', 'right', 'fwd', 'fwd']);
  const f = parseField(['...', '.S.']); f.beacons.add('1,0');
  assert.equal(simulate(f, [until('atBeacon', R()), forever(F())]).outcome, 'win');
});

test('VE ile VEYA doğru doğruluk tablolarını ve şerit duvarını kullanır', () => {
  for (const [row, ahead, rightFree] of [['...', false, true], ['.M.', true, true], ['..M', false, false], ['.MM', true, false]]) {
    const f = parseField([row, '.S.']);
    assert.equal(sense(f, 1, 0, 'aheadAndRightFree').result, ahead && rightFree);
    assert.equal(sense(f, 1, 0, 'aheadOrRightBlocked').result, ahead || !rightFree);
  }
  assert.equal(sense(parseField(['...', '..S']), 2, 0, 'aheadOrRightBlocked').result, true);
  // İşaret ile meteor: VEYA için biri yeter, VE ikisini birden ister.
  for (const [lines, y, at, ahead] of [[['...', '...', '.S.'], 0, false, false], [['.M.', '...', '.S.'], 1, false, true], [['...', '.B.', '.S.'], 1, true, false], [['.M.', '.B.', '.S.'], 1, true, true]]) {
    const f = parseField(lines);
    assert.equal(sense(f, 1, y, 'atBeaconOrAhead').result, at || ahead);
    assert.equal(sense(f, 1, y, 'atBeaconAndAhead').result, at && ahead);
  }
});

test('eski VEYA sensörü hiçbir görevde sunulmuyor ama kayıtlı programlar için tanımlı', () => {
  assert.ok(CONDS.aheadOrRightBlocked);
  for (const l of LEVELS) assert.ok(!l.conds.includes('aheadOrRightBlocked'), l.id);
});

test('kalkan bir korsan saldırısını durdurur, olay her yeni saldırıda çalışır', () => {
  const lines = ['...', '.P.', '...', '.P.', '.S.'];
  assert.equal(run(lines, [shield(), forever(F())]).reason, 'pirate');
  const result = run(lines, [on('pirate', shield()), forever(F())]);
  assert.equal(result.outcome, 'win');
  assert.equal(result.events.filter((e) => e.t === 'event').length, 2);
  assert.equal(result.events.filter((e) => e.blocked).length, 2);
  assert.equal(result.shielded, false);
  assert.equal(run(['...', '.M.', '.S.'], [shield(), forever(F())]).reason, 'meteor');
});

test('açık kalkan yeniden açılamaz: döngüde kalkan açmak olayın yerini tutmaz', () => {
  const lines = ['...', '.P.', '...', '.P.', '...', '.S.'];
  const polled = run(lines, [forever(shield(), F())]);
  assert.equal(polled.outcome, 'fail');
  assert.equal(polled.reason, 'shield');
  assert.equal(polled.ticks, 1, 'ikinci turdaki kalkan komutu uçuşu durdurur');
  // Saldırı kalkanı indirir; ondan sonra yeniden açmak serbesttir.
  assert.equal(run(lines, [shield(), F(), F(), shield(), forever(F())]).outcome, 'win');
});

test('işaret ve kristal olayları yalnızca varınca çalışır', () => {
  for (const [symbol, event] of [['B', 'beacon'], ['K', 'crystal']]) {
    const result = run(['...', '.P.', `.${symbol}.`, '.S.'], [on(event, shield()), forever(F())]);
    assert.equal(result.outcome, 'win');
    assert.equal(result.events.filter((e) => e.t === 'event')[0].y, 1);
  }
  assert.equal(run(['.K.', '.P.', '.S.'], [on('crystal', shield()), forever(F())]).reason, 'pirate');
});

test('olay içindeki manevra çakışan uçuş komutunun yerini alır', () => {
  const result = run(['...', '...', '.P.', '.S.'], [on('pirate', R()), forever(F())]);
  assert.equal(result.outcome, 'win');
  assert.equal(result.ticks, 4);
  assert.deepEqual(result.events.find((e) => e.t === 'move').to, { lane: 2, y: 1 });
});

test('bir olay gemiyi başka nesneye taşıyınca varış olayı iki kez tetiklenmez', () => {
  const result = run(['...', '..B', '.K.', '.S.'], [on('crystal', R()), on('beacon', shield()), forever(F())]);
  assert.equal(result.outcome, 'win');
  assert.equal(result.events.filter((e) => e.t === 'event' && e.event === 'beacon').length, 1);
});

test('enerji çıkış adımı dahil her uçuşta bir azalır; istasyon kendi kendine doldurmaz', () => {
  const lines = ['...', '...', '.E.', '.S.'];
  assert.equal(run(lines, [forever(F())]).reason, 'energy');
  assert.equal(run(lines, [setEnergy(3), forever(F())]).reason, 'energy');
  const result = run(lines, [setEnergy(4), forever(F())]);
  assert.equal(result.outcome, 'win');
  assert.equal(result.energy, 0);
  assert.deepEqual(result.events.filter((e) => e.t === 'move').map((e) => e.energy), [3, 2, 1, 0]);
});

test('enerji yalnızca istasyonda artırılır ve sensör güncel değeri okur', () => {
  assert.equal(run(['...', '.E.', '.S.'], [setEnergy(1), addEnergy(3)]).reason, 'station');
  const result = run(['...', '...', '.E.', '.S.'], [on('energy', addEnergy(3)), setEnergy(1), forever(F())]);
  assert.equal(result.outcome, 'win');
  assert.equal(result.energy, 0);
  assert.equal(run(['...', '.S.'], [setEnergy(-1), F()]).reason, 'value');
  const f = parseField(['...', '.S.']);
  assert.equal(sense(f, 1, 0, 'energyLow', { energy: 2 }).result, true);
  assert.equal(sense(f, 1, 0, 'energyLow', { energy: 3 }).result, false);
});

test('depo sınırlıdır: fazla şarj taşar, sayaç dolu depoda kalır', () => {
  const lines = ['...', '...', '.E.', '.S.'];
  const result = run(lines, [on('energy', addEnergy(9)), setEnergy(3), forever(F())]);
  assert.equal(result.outcome, 'fail');
  assert.equal(result.reason, 'overflow');
  assert.equal(result.energy, ENERGY_MAX);
  assert.equal(result.events.filter((e) => e.t === 'variable').at(-1).value, ENERGY_MAX);
  // Tam dolduran şarj taşma değildir.
  assert.equal(run(lines, [on('energy', addEnergy(7)), setEnergy(3), forever(F())]).outcome, 'win');
});

test('bir dalganın enerjisi, olayları ve fonksiyonları diğerine taşınmaz', () => {
  const f = parseField(['...', '.E.', '.S.']);
  const program = [on('energy', addEnergy(3)), setEnergy(1), forever(F())];
  assert.deepEqual(simulate(f, program), simulate(f, program));
  assert.equal(simulate(f, [forever(F())]).reason, 'energy');
  const plain = parseField(['...', '.S.']);
  assert.equal(simulate(plain, [define('straight', F()), call('straight'), call('straight')]).outcome, 'win');
  assert.equal(simulate(plain, [call('straight')]).reason, 'function');
});

test('fonksiyon tanımı uçmaz; çağrı gövdeyi çalıştırır ve olaylardan da çağrılabilir', () => {
  assert.equal(run(['...', '.S.'], [define('straight', F())]).ticks, 0);
  const result = run(['...', '.P.', '.S.'], [define('protect', shield()), on('pirate', call('protect')), forever(F())]);
  assert.equal(result.outcome, 'win');
  assert.ok(result.events.some((e) => e.t === 'call' && e.name === 'protect'));
  assert.equal(run(['...', '.S.'], [define('safe'), define('safe')]).reason, 'definition');
  assert.equal(run(['...', '.S.'], [define('safe', call('safe')), call('safe')]).reason, 'recursion');
});

test('hareketsiz yeni döngüler ve boş fonksiyonlar sınırlı olayla durur', () => {
  for (const program of [[until('atBeacon')], [forever(setEnergy(3))], [define('safe'), forever(call('safe'))]]) {
    const result = run(['...', '.S.'], program);
    assert.equal(result.outcome, 'fail');
    assert.equal(result.reason, 'idle');
    assert.ok(result.events.length < 30);
  }
});

test('yeni kapsayıcıların tamamı kopyalanır, sayılır ve içlerinden blok silinir', () => {
  const action = addEnergy(3);
  const program = [define('refuel', action), on('energy', call('refuel')), until('atBeacon', F())];
  const copy = clone(program);
  assert.equal(count(program), 6);
  assert.notEqual(copy[0].body[0].id, action.id);
  assert.equal(find(program, action.id).block, action);
  assert.equal(remove(program, action.id), action);
  assert.equal(count(program), 5);
  for (const type of ['until', 'on', 'define', 'call', 'shield', 'setEnergy', 'addEnergy']) assert.equal(create(type).type, type);
});

test('Python görünümü yeni mantığı, olayları, değişkenleri ve fonksiyonları gösterir', () => {
  const py = toPython([define('protect', shield()), on('pirate', call('protect')), setEnergy(3), until('atBeacon', ifelse('aheadAndRightFree', [R()], [F()])), addEnergy(3)]);
  assert.match(py, /def korunma\(\):\n    kalkan_ac\(\)/);
  assert.match(py, /@korsan_gorunce/);
  assert.match(py, /enerji = 3/);
  assert.match(py, /while not \(isarette_miyim\(\)\):/);
  assert.match(py, /onumde_meteor_var\(\) and sagim_bos\(\)/);
  assert.match(py, /enerji \+= 3/);
});

test('her görevde olay ve fonksiyon adları düzenleyiciden seçilebilir', () => {
  function check(program, level) {
    for (const b of program) {
      if (b.type === 'on') assert.ok(level.events.includes(b.event), `${level.id}: olay ${b.event}`);
      if (['define', 'call'].includes(b.type)) assert.ok(level.functions.includes(b.name), `${level.id}: fonksiyon ${b.name}`);
      for (const k of CONTAINERS[b.type] || []) check(b[k], level);
    }
  }
  for (const level of LEVELS.filter((l) => l.sector >= 4)) {
    check(level.solution(), level);
    if (level.initial) check(level.initial(), level);
  }
});

test('değişen işaret dalgaları tek bir sabit mesafeye indirgenmez', () => {
  const level = LEVELS.find((l) => l.id === '4-2');
  const positions = level.waves.map((w) => [...parseField(w).beacons][0]);
  assert.equal(new Set(positions).size, 3);
  for (const n of [2, 4, 6]) {
    const fixed = [...Array.from({ length: n }, F), R(), forever(F())];
    assert.ok(level.waves.some((w) => simulate(parseField(w), fixed).outcome !== 'win'));
  }
});

// ───────────── görev tasarımı: kavram gerçekten gerekli mi? ─────────────

test('baştan tasarlanan görevlerde eski kayıtlı program açılmaz, ötekilerde kayıt anahtarı değişmez', () => {
  for (const l of LEVELS) assert.equal(l.saveKey, l.rev ? `${l.id}@${l.rev}` : l.id);
  assert.deepEqual(LEVELS.filter((l) => l.sector <= 3 && l.rev).map((l) => l.id), ['3-6'], 'ilk üç sektörde yalnız baştan kurulan 3-6 yeni kayıt anahtarı alır');
});

test('her görevin alanı kendine özgüdür: aynı alan yalnız "aynı rota, yeni yazım" çiftinde tekrar eder', () => {
  const owners = new Map();
  for (const l of [...LEVELS, ...EXTRAS].filter((x) => !x.tahmin)) for (const w of l.waves) {
    const key = w.join('/');
    owners.set(key, new Set([...(owners.get(key) || []), l.id]));
  }
  const shared = [...owners.values()].filter((ids) => ids.size > 1).map((ids) => [...ids].join(' = '));
  // 6-3, 6-2'nin rotasını bilerek tekrar eder: aynı yol bu kez saymadan, sensörle uçulur.
  assert.deepEqual(shared, ['6-2 = 6-3']);
});

test('kanyon süsü çözümü değiştirmez: kayalar rotanın en az iki şerit uzağına düşer', () => {
  const steerLoop = () => [forever(twoSensor())];
  for (const [path, start] of [['FRLFFLRFFRLF', 2], ['LLRFRRFLFLFF', 2], ['RLRLRLFFFF', 1]]) {
    const plain = route(path, { start }), rocky = route(path, { start, canyon: 7, fill: 1 });
    const moves = (lines) => simulate(parseField(lines), steerLoop()).events.filter((e) => e.t === 'move').map((e) => e.kind);
    assert.deepEqual(moves(rocky), moves(plain), path);
    assert.equal(simulate(parseField(rocky), steerLoop()).outcome, 'win');
    assert.deepEqual(route(path, { start, canyon: 7 }), route(path, { start, canyon: 7 }), 'tohumlu: aynı tanım hep aynı alan');
    // Geminin bulunduğu sıradan bir üst sıraya bakan üç sensörün (ön, sağ, sol) gördüğü kareler süssüz alandakiyle aynıdır.
    const a = parseField(plain), b = parseField(rocky);
    let lane = start;
    [...path].slice(0, -1).forEach((step, y) => {
      for (const d of [-1, 0, 1]) assert.equal(b.meteors.has(`${lane + d},${y + 1}`), a.meteors.has(`${lane + d},${y + 1}`), `${path} ${y}`);
      lane += { F: 0, L: -1, R: 1 }[step.toUpperCase()];
    });
    assert.ok(b.meteors.size > a.meteors.size, 'süs kaya ekler');
  }
});

test('3-6: önce sola bakan program bütün kristalleri toplar; önce sağa bakan geçer ama kristal yıldızını alamaz', () => {
  const level = levelById('3-6'), left = () => [forever(twoSensorLeft())], right = () => [forever(twoSensor())];
  assert.equal(starsOf(level, left()), 3);
  assert.equal(starsOf(level, right()), 2);
  for (const r of fly(level, right())) { assert.equal(r.outcome, 'win'); assert.ok(r.collected < r.total, 'her dalgada kaçan kristal var'); }
  for (const w of level.waves) assert.ok(parseField(w).crystals.size >= 2);
});

test('Sektör 3: her dalgada kristal var; kristaller doğru sayılan her çözümün yolundadır', () => {
  for (const level of levelsOf(3)) {
    for (const w of level.waves) assert.ok(parseField(w).crystals.size >= 1, `${level.id}: kristalsiz dalga`);
    for (const r of fly(level, level.solution())) assert.equal(r.collected, r.total, level.id);
  }
});

test('çok dalgalı görevlerde bir dalganın ezberi öteki dalgaları geçemez', () => {
  for (const level of advanced.filter((l) => l.waves.length > 1)) {
    assert.equal(new Set(level.waves.map((w) => w.join())).size, level.waves.length, `${level.id}: dalgalar aynı`);
    level.waves.forEach((w, i) => {
      const memo = simulate(parseField(w), level.solution()).events.filter((e) => e.t === 'move').map((e) => ({ id: 'm', type: e.kind }));
      const others = level.waves.filter((_, j) => j !== i).map((o) => simulate(parseField(o), memo));
      assert.ok(others.some((r) => r.outcome !== 'win'), `${level.id}: ${i + 1}. dalganın ezberi her yerde işliyor`);
    });
  }
});

test('iki sensörlü görevlerde tek yöne kaçmak yetmez; önce sola bakan ayna mantık da 3 yıldız alır', () => {
  const levels = advanced.filter((l) => hasSteer(l.solution()));
  assert.ok(levels.length >= 12);
  for (const level of levels) {
    const sol = level.solution();
    assert.equal(starsOf(level, swapSteer(sol, twoSensorLeft)), 3, `${level.id}: ayna mantık`);
    assert.ok(!wins(level, swapSteer(sol, () => ifelse('ahead', [L()], [F()]))), `${level.id}: yalnız sola kaçmak yetiyor`);
    assert.ok(!wins(level, swapSteer(sol, () => ifelse('ahead', [R()], [F()]))), `${level.id}: yalnız sağa kaçmak yetiyor`);
  }
});

test('Sektör 5: kalkanı olaya bağlamayan program geçemez', () => {
  for (const level of levelsOf(5)) {
    const plain = level.solution().filter((b) => b.type !== 'on');
    const polled = plain.map((b) => (['forever', 'until'].includes(b.type) ? { ...b, body: [shield(), ...b.body] } : b));
    assert.ok(!wins(level, polled), `${level.id}: döngüde kalkan yetiyor`);
    assert.ok(!wins(level, [shield(), ...plain]), `${level.id}: baştaki tek kalkan yetiyor`);
    assert.ok(parseField(level.waves[0]).pirates.size >= 2, `${level.id}: tek korsan olayı gereksiz kılar`);
  }
});

test('Sektör 5: korsanlar geçit tutar; hiçbir dalgada korsana uğramadan çıkışa varan yol yoktur', () => {
  // Kayalara ve korsanlara girmeden başlangıçtan çıkışa varılabiliyor mu? (her adım bir sıra ilerler)
  const bypass = (lines) => {
    const f = parseField(lines);
    let lanes = new Set([f.start]);
    for (let y = 1; y < f.rows && lanes.size; y++) {
      const next = new Set();
      for (const lane of lanes) for (const d of [-1, 0, 1]) {
        const l = lane + d, k = `${l},${y}`;
        if (l >= 0 && l < f.lanes && !f.meteors.has(k) && !f.pirates.has(k)) next.add(l);
      }
      lanes = next;
    }
    return lanes.size > 0;
  };
  for (const level of levelsOf(5)) for (const [i, w] of level.waves.entries()) assert.ok(!bypass(w), `${level.id} dalga ${i + 1}: korsanların yanından dolaşılıyor`);
  // Kalkansız hiçbir düz ya da yana kayan uçuş geçemez.
  const first = levelById('5-1');
  for (const p of [[forever(F())], [L(), forever(F())], [R(), forever(F())], [L(), L(), forever(F())], [R(), R(), forever(F())]]) assert.ok(!wins(first, p));
});

test('VEYA görevinde her koşul tek başına da tetikler; hata avında yalnızca koşulu değiştirmek yeter', () => {
  const or = levelById('4-4'), field = parseField(or.waves[0]);
  const senses = simulate(field, or.solution()).events.filter((e) => e.t === 'sense' && e.result);
  const alone = senses.map((e) => [field.beacons.has(`${e.lane},${e.y}`), field.meteors.has(`${e.lane},${e.y + 1}`)]);
  assert.ok(alone.some(([at, ahead]) => at && !ahead), 'yalnızca işaret');
  assert.ok(alone.some(([at, ahead]) => !at && ahead), 'yalnızca meteor');

  const bug = levelById('4-7'), fixed = bug.initial();
  assert.equal(starsOf(bug, fixed), 0);
  fixed[0].body[0].cond = 'atBeaconOrAhead';
  assert.equal(starsOf(bug, fixed), 3);
  assert.deepEqual(bug.conds, ['atBeaconAndAhead', 'atBeaconOrAhead']);
});

test('büyük finalin karar ağacı yol boşken kaçmaz', () => {
  const safe = levelById('8-8').solution().find((b) => b.type === 'define' && b.name === 'safe');
  const first = (row) => simulate(parseField([row, '..S..']), [clone([safe])[0], call('safe')]).events.find((e) => e.t === 'move' || e.t === 'crash').kind;
  assert.equal(first('.....'), 'fwd');
  assert.equal(first('...M.'), 'fwd', 'sağ dolu ama yol boş: düz uçmalı');
  assert.equal(first('..M..'), 'right');
  assert.equal(first('..MM.'), 'left');
});

test('Sektör 6: şarj etmeden ya da enerjiye bakmadan geçilemez', () => {
  const stops = levelById('6-2');
  assert.ok(parseField(stops.waves[0]).rows > ENERGY_MAX, 'yol depodan uzun olmalı');
  assert.ok(!wins(stops, [setEnergy(9), rep(9, F()), rep(3, F())]));

  const need = levelById('6-5');
  for (const [start, add] of [[6, 6], [6, 3], [3, 3], [9, 3], [3, 6], [9, 9]]) {
    assert.ok(!wins(need, [setEnergy(start), forever(ifelse('atEnergy', [addEnergy(add)], []), F())]), `her istasyonda şarj (${start}, +${add}) geçiyor`);
    assert.ok(!wins(need, [setEnergy(start), forever(ifelse('energyLow', [addEnergy(add)], []), F())]), `yalnızca enerjiye bakmak (${start}, +${add}) geçiyor`);
  }
});

test('Sektör 7: halkaya kadar çağırmak ve aynı fonksiyonu iki döngüde kullanmak gerçekten gerekli', () => {
  const zig = levelById('7-5'), z = () => define('zigzag', R(), L());
  assert.equal(zig.waves.length, 3);
  for (const n of [2, 3, 4]) assert.ok(!wins(zig, [z(), rep(n, call('zigzag')), forever(F())]), `${n} zikzak saymak yetiyor`);
  assert.ok(!wins(zig, [z(), forever(call('zigzag'))]), 'halkadan sonra zikzak sürdürülebiliyor');

  const fin = levelById('7-8'), guard = () => on('pirate', shield());
  assert.ok(!wins(fin, [define('safe', twoSensor()), guard(), forever(call('safe'))]), 'halkadaki dönüş gereksiz');
  const inline = [guard(), until('atBeacon', twoSensor()), R(), forever(twoSensor())];
  assert.ok(wins(fin, inline) && count(inline) > fin.maxBlocks, 'fonksiyonsuz yazım blok sınırına sığmamalı');
  // Geçitten önce de sonra da tam karar ağacı gerekir: daha ucuz bir ikinci döngü yetmez.
  for (const cheap of [() => ifelse('ahead', [L()], [F()]), () => ifelse('ahead', [R()], [F()]), () => ifelse('leftFree', [L()], [R()]), () => ifelse('rightFree', [R()], [L()])]) {
    assert.ok(!wins(fin, [guard(), until('atBeacon', twoSensor()), R(), forever(cheap())]));
    assert.ok(!wins(fin, [guard(), until('atBeacon', cheap()), R(), forever(twoSensor())]));
  }
});
