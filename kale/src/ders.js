// Ders ekranı: üstte tahta, altta program. Program önce baştan sona hesaplanır, sonra kare kare
// oynatılır; bu yüzden "adım" düğmesi ve denemeler arası geçiş aynı kayıt üzerinde yürür.
import { initState, simulate } from './motor.js';
import { parseProg, printProg, countBlocks, GIVES } from './bloklar.js';
import { LESSONS, runLesson, waveLevel, failText } from './dersler.js';
import { createBoard } from './tahta.js';
import { createEditor } from './editor.js';
import { h, ic, sheet, topbar } from './arayuz.js';
import { sfx, sfxFor } from './ses.js';

const safeParse = (text, fallback) => { try { return parseProg(text ?? fallback); } catch (err) { return parseProg(fallback); } };

export function lessonScreen(ctx, lesson) {
  const { data } = ctx, parts = lesson.parts, predict = lesson.type === 'tahmin';
  const draft = data.drafts[lesson.id];
  const progs = parts.map((p, i) => safeParse(p.lock ? p.start : draft && draft[i], p.start));
  let active = Math.max(0, parts.findIndex((p) => !p.lock));
  let wave = 0, run = null, timer = 0, playing = false, fast = false, level = null;
  let guess = null, tries = 0, hintAt = 0, finished = false;

  const msg = h('div', { class: 'msg' });
  const board = createBoard({ onCell });
  const stage = h('div', { class: 'stage' }, msg, h('div', { class: 'boardbox' }, board.el));
  const runBtn = h('button', { class: 'btn go run', onclick: toggle });
  const stepBtn = h('button', { class: 'btn', 'aria-label': 'Adım', onclick: stepOnce }, ic('step'), h('span', { class: 'lbl', text: 'Adım' }));
  const resetBtn = h('button', { class: 'btn', 'aria-label': 'Baştan', onclick: reset }, ic('reset'));
  const speedBtn = h('button', { class: 'btn', text: '1×', 'aria-label': 'Hız', onclick: () => { fast = !fast; speedBtn.textContent = fast ? '2×' : '1×'; } });
  const waves = h('div', { class: 'waves' });
  // Deneme düğmeleri de sığsın diye çok denemeli derslerde "Adım" yalnız ikonuyla durur.
  const runbar = h('div', { class: `runbar ${lesson.waves.length > 1 && !predict ? 'many' : ''}` }, resetBtn, runBtn, stepBtn, speedBtn, waves);
  const tabs = h('div', { class: 'tabs' });
  const editor = createEditor({ onChange });
  const panel = h('div', { class: 'panel' }, runbar, tabs, editor.el);
  const el = h('div', { class: 'screen' },
    topbar(`${lesson.id} · ${lesson.title}`, { onBack: () => ctx.back('okul'), right: [h('button', { class: 'btn small hintbtn', text: 'İpucu', onclick: hint })] }),
    h('div', { class: 'game' }, stage, panel));

  function setMsg(text, cls = '') { msg.className = `msg ${cls}`; msg.textContent = text; }

  function loadEditor() {
    const p = parts[active];
    editor.load({ prog: progs[active], tools: p.tools, cap: p.cap, readonly: !!p.lock });
    tabs.replaceChildren(...(parts.length > 1 ? parts.map((part, i) => h('button', { class: `tab ${i === active ? 'on' : ''}`, text: part.name || `Parça ${i + 1}`, onclick: () => { active = i; loadEditor(); board.select(i); } })) : []));
    tabs.hidden = parts.length < 2;
  }

  function drawWaves() {
    waves.replaceChildren(...(lesson.waves.length > 1 && !predict ? lesson.waves.map((_, i) => {
      const state = run && run.res.runs[i] ? (run.res.runs[i].ok ? (i < run.w || run.done ? 'ok' : '') : (run.done ? 'bad' : '')) : '';
      return h('button', { class: `wave ${i === wave ? 'on' : ''} ${state}`, text: String(i + 1), 'aria-label': `${i + 1}. deneme`, onclick: () => { if (!playing) { stop(); run = null; wave = i; idle(); } } });
    }) : []));
  }

  /** Çalışmayan hal: seçili denemenin başlangıcı. */
  function idle() {
    level = waveLevel(lesson, wave, progs);
    board.setLevel(level);
    board.render(initState(level), [], true);
    if (parts.length > 1) board.select(active);
    editor.highlight(null);
    if (guess) board.mark(guess.x, guess.y, 'guess');
    buttons(); drawWaves(); coach(); fit();
  }

  function buttons() {
    runBtn.replaceChildren(...(predict ? [ic('check'), 'Bu kare!'] : playing ? [ic('stop'), 'Dur'] : [ic('play'), 'Başlat']));
    runBtn.disabled = predict && (!guess || playing);
    stepBtn.hidden = speedBtn.hidden = predict;
    resetBtn.hidden = predict && !run;
  }

  /** İlk derste bir sonraki dokunulacak yeri gösterir: yazı okumadan başlanabilsin. */
  function coach() {
    el.querySelectorAll('.coach').forEach((n) => n.classList.remove('coach'));
    if (!lesson.coach || ctx.isDone(lesson.id) || run) return;
    const target = countBlocks(progs[0]) < 3 ? editor.el.querySelector('[data-add="fwd"]') : runBtn;
    if (target) target.classList.add('coach');
  }

  function stop() { clearTimeout(timer); playing = false; }
  function reset() { stop(); run = null; if (predict) { guess = null; board.clearMarks(); wave = tries % lesson.waves.length; setMsg(lesson.text); } idle(); }

  function begin() {
    stop();
    let res;
    if (predict) { const lv = waveLevel(lesson, wave, progs), r = simulate(lv, lesson.goal); res = { ok: true, wave: 0, runs: [{ level: lv, ...r }] }; }
    else res = runLesson(lesson, progs);
    run = { res, w: 0, frame: 0, done: false };
    if (!predict) wave = 0;
    show(true);
    setMsg(lesson.text);
  }

  /** Kayıttaki o anki kareyi çizer. */
  function show(fresh) {
    const r = run.res.runs[run.w], f = r.frames[run.frame];
    if (fresh) { level = r.level; board.setLevel(level); if (parts.length > 1) board.select(active); if (guess) board.mark(guess.x, guess.y, 'guess'); fit(); }
    board.render(f.state, f.fx, fresh);
    editor.highlight(f.state.ents[active] ? f.state.ents[active].cur : null);
    if (!fresh) sfxFor(f.fx);
    drawWaves();
  }

  /** Bir kare ilerler. Deneme bittiyse sıradakine geçer ya da sonucu söyler. false: kayıt bitti. */
  function advance() {
    const r = run.res.runs[run.w];
    if (run.frame < r.frames.length - 1) { run.frame++; show(false); return true; }
    if (run.w < run.res.runs.length - 1) { run.w++; run.frame = 0; wave = run.w; show(true); return true; }
    finish();
    return false;
  }

  function tick() {
    if (!playing) return;
    const r = run.res.runs[run.w], last = run.frame >= r.frames.length - 1;
    if (!advance()) return;
    timer = setTimeout(tick, last ? 900 : run.frame >= run.res.runs[run.w].frames.length - 1 ? 700 : fast ? 170 : 380);
  }

  function toggle() {
    sfx('tap');
    if (predict) { if (guess) { begin(); playing = true; buttons(); timer = setTimeout(tick, 400); } return; }
    if (playing) { stop(); buttons(); return; }
    if (!run || run.done) begin();
    playing = true; buttons(); coach();
    timer = setTimeout(tick, 250);
  }

  function stepOnce() {
    sfx('tap');
    stop();
    if (!run || run.done) begin();
    advance();
    buttons(); coach();
  }

  function finish() {
    stop(); run.done = true;
    const res = run.res;
    if (predict) {
      const end = res.runs[0].end, ok = end.x === guess.x && end.y === guess.y;
      board.clearMarks();
      board.mark(end.x, end.y, ok ? 'right' : 'wrong');
      if (ok) return win();
      tries++; guess = null; sfx('fail');
      setMsg('Tutmadı: şövalye işaretli karede durdu. ↺ ile yeni bir başlangıç gelir; bir daha tahmin et.', 'bad');
      buttons();
      return;
    }
    buttons(); drawWaves();
    if (res.ok) return win();
    sfx('fail');
    setMsg(failText(lesson, res), 'bad');
  }

  function win() {
    sfx('win');
    const first = !ctx.isDone(lesson.id);
    ctx.finishLesson(lesson.id);
    finished = true;
    buttons(); drawWaves();
    const give = GIVES[lesson.id], next = LESSONS.find((l) => l.id === lesson.id + 1);
    setMsg('Oldu!', 'good');
    const s = sheet([
      h('div', { class: 'sheet-title big', text: next ? 'Harika!' : 'Okulu bitirdin!' }),
      give && first ? h('div', { class: 'gift' }, h('b', { text: give.title }), h('span', { text: give.text })) : h('p', { class: 'sheet-text', text: next ? 'Ders tamam.' : 'Bütün bloklar ve parçalar artık atölyede.' }),
      h('div', { class: 'row' },
        ctx.open().workshop && h('button', { class: `btn ${next ? '' : 'go'}`, text: 'Atölyeye git', onclick: () => { s.close(); ctx.go('atolye'); } }),
        next && h('button', { class: 'btn go', text: 'Sıradaki ders', onclick: () => { s.close(); ctx.go(`ders/${next.id}`); } })),
    ], { cls: 'result' });
  }

  function hint() {
    setMsg(`İpucu: ${lesson.hints[hintAt % lesson.hints.length]}`, 'hint');
    hintAt++;
  }

  function onChange(prog) {
    progs[active] = prog;
    data.drafts[lesson.id] = progs.map(printProg);
    ctx.save();
    stop(); run = null;
    if (!finished) setMsg(lesson.text);
    idle();
  }

  function onCell(x, y) {
    if (predict) {
      if (playing || (run && !run.done) || finished) return;
      if (run) { run = null; wave = tries % lesson.waves.length; setMsg(lesson.text); idle(); return; }
      if (level.wall[y][x]) return;
      guess = { x, y };
      board.clearMarks(); board.mark(x, y, 'guess');
      sfx('tap'); buttons();
      return;
    }
    const i = level.ents.findIndex((e) => e.x === x && e.y === y);
    if (i >= 0 && parts.length > 1 && i !== active) { active = i; loadEditor(); board.select(i); }
  }

  /** Tahtayı ekrana sığdırır: telefonda ekranın en çok üçte biri (program alanı dar kalmasın), geniş ekranda sol sütun. */
  function fit() {
    if (!level) return;
    const wide = stage.parentElement && getComputedStyle(stage.parentElement).flexDirection === 'row';
    const availW = stage.clientWidth - 20;
    const availH = wide ? stage.clientHeight - msg.offsetHeight - 28 : Math.round(window.innerHeight * 0.34);
    const cell = Math.max(22, Math.min(64, Math.floor(Math.min(availW / level.w, availH / level.h))));
    board.setCell(cell);
  }

  setMsg(lesson.text);
  loadEditor();
  idle();
  return { el, fit, destroy: stop };
}
