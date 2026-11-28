// Atölye: kale listesi ve kale kurma ekranı. Oyunun merkezi burasıdır: çocuk kareleri doldurur,
// koyduğu her canavara, kapıya ve dikene program yazar, kalesini kendisi bitirir ve birine oynatır.
import { buildLevel, initState } from './motor.js';
import { parseProg, printProg, toolsFor, lessonFor, KIND_NAMES } from './bloklar.js';
import { paint, masterChecks, SAMPLES } from './kaleler.js';
import { createBoard } from './tahta.js';
import { createEditor } from './editor.js';
import { PIECES } from './cizim.js';
import { h, ask, topbar } from './arayuz.js';
import { sfx } from './ses.js';

const TOOL_ORDER = ['select', 'wall', 'erase', 'knight', 'chest', 'monster', 'coin', 'spikes', 'door', 'key', 'plate'];
const FREE_TOOLS = new Set(['select', 'erase']);
const DELETE = Symbol('sil');
const TOOL_TIP = {
  select: 'Bir parçaya dokun: programını yaz.',
  wall: 'Duvar: karelere dokun ya da parmağını sürükle.',
  erase: 'Sil: kaldırmak istediğin kareye dokun.',
  knight: 'Şövalye buradan başlar: yeni yerine dokun.',
  chest: 'Hazine: yeni yerine dokun.',
  monster: 'Canavar: koymak istediğin kareye dokun.',
  coin: 'Altın: koymak istediğin karelere dokun.',
  spikes: 'Diken: koymak istediğin kareye dokun.',
  door: 'Kapı: koymak istediğin kareye dokun.',
  key: 'Anahtar: koymak istediğin kareye dokun.',
  plate: 'Düğme: koymak istediğin kareye dokun.',
};

function miniBoard(castle) {
  const board = createBoard(), level = buildLevel(castle);
  board.setLevel(level, { mini: true });
  board.render(initState(level), [], true);
  return board.el;
}

/** Kale listesi: usta işi, kendi kalelerin ve örnek kaleler. */
export function workshopScreen(ctx) {
  const { data } = ctx, open = ctx.open();
  const done = ctx.all ? 11 : data.done.length;
  const checks = masterChecks(data.castles);
  const master = h('section', { class: 'card master' },
    h('h2', { text: checks.every((c) => c.done) ? 'Kale Ustası oldun!' : 'Usta işi' }),
    h('ul', { class: 'checks' }, checks.map((c) => h('li', { class: c.done ? 'done' : '' },
      h('span', { class: 'tick', text: c.done ? '✓' : '' }),
      h('span', { text: c.text + (!c.done && c.lesson && !open.blocks.has('on') ? ` (${c.lesson}. dersten sonra)` : '') })))));

  const mine = h('div', { class: 'castles' },
    data.castles.map((c) => h('button', { class: 'castle', onclick: () => ctx.go(`kur/${c.id}`) },
      miniBoard(c),
      h('span', { class: 'castle-name', text: c.name }),
      h('span', { class: `castle-tag ${c.proven ? 'ok' : ''}`, text: c.proven ? 'kanıtlandı' : 'yapım aşamasında' }))),
    h('button', { class: 'castle new', onclick: () => ctx.go(`kur/${ctx.newCastle().id}`) }, h('span', { class: 'plus', text: '+' }), h('span', { class: 'castle-name', text: 'Yeni kale' })));

  const samples = SAMPLES.map((s, i) => ({ s, i })).filter(({ s }) => ctx.all || done >= s.lesson);
  const examples = h('div', { class: 'castles' }, samples.map(({ s, i }) => h('div', { class: 'castle sample' },
    miniBoard(s),
    h('span', { class: 'castle-name', text: s.name }),
    h('div', { class: 'row tight' },
      h('button', { class: 'btn small go', text: 'Oyna', onclick: () => ctx.go(`ornek/${i}`) }),
      h('button', { class: 'btn small', text: 'Kopyala', onclick: () => ctx.copyCastle(s) })))));

  const el = h('div', { class: 'screen' },
    topbar('Atölye', { onBack: () => ctx.back('') }),
    h('div', { class: 'scroll' }, master,
      h('h2', { class: 'section', text: 'Kalelerim' }), mine,
      h('h2', { class: 'section', text: 'Örnek kaleler' }),
      h('p', { class: 'note', text: 'Önce oyna; sonra kopyalayıp kendine göre değiştir.' }), examples));
  return { el };
}

/** Kale kurma ekranı. */
export function buildScreen(ctx, castle) {
  const open = ctx.open();
  let tool = 'select', sel = -1, level = null;

  const msg = h('div', { class: 'msg' });
  const board = createBoard({ onCell });
  const stage = h('div', { class: 'stage' }, msg, h('div', { class: 'boardbox' }, board.el));
  const toolbox = h('div', { class: 'tools' });
  const codeHead = h('div', { class: 'codehead' });
  const editor = createEditor({ onChange });
  const code = h('div', { class: 'code' }, codeHead, editor.el);
  const panel = h('div', { class: 'panel' }, toolbox, code);
  const nameBtn = h('button', { class: 'top-title name', onclick: rename });
  const el = h('div', { class: 'screen' },
    topbar(nameBtn, {
      onBack: () => ctx.back('atolye'),
      right: [
        h('button', { class: 'btn small go', text: '▶ Oyna', onclick: () => ctx.go(`oyna/${castle.id}`) }),
        h('button', { class: 'btn small', text: 'Paylaş', onclick: () => ctx.share(castle) }),
      ],
    }),
    h('div', { class: 'game' }, stage, panel));

  function setMsg(text, cls = '') { msg.className = `msg ${cls}`; msg.textContent = text; }

  function refresh() {
    level = buildLevel(castle);
    board.setLevel(level);
    board.render(initState(level), [], true);
    board.select(sel >= 0 ? sel : null);
    nameBtn.textContent = `${castle.name} ✎`;
    fit();
  }

  function drawTools() {
    toolbox.replaceChildren(...TOOL_ORDER.map((t) => {
      const locked = !FREE_TOOLS.has(t) && !open.pieces.has(t), piece = PIECES[t];
      return h('button', {
        class: `tool ${t === tool ? 'on' : ''} ${locked ? 'locked' : ''}`,
        onclick: () => {
          if (locked) return setMsg(`«${piece.label}» ${lessonFor('pieces', t)}. dersten sonra açılır.`, 'hint');
          tool = t; sfx('tap'); setMsg(TOOL_TIP[t]); drawTools();
        },
      }, h('span', { class: 'tool-art', html: piece.art() }), h('span', { class: 'tool-name', text: locked ? `Ders ${lessonFor('pieces', t)}` : piece.label }));
    }));
  }

  /** Paneli parça seçiliyse program yazmaya, değilse parça paletine çevirir. */
  function mode() {
    const ent = castle.ents[sel];
    panel.classList.toggle('coding', !!ent);
    stage.classList.toggle('coding', !!ent);
    if (!ent) { drawTools(); setMsg(TOOL_TIP[tool]); fit(); return; }
    const flip = ent.kind === 'monster' ? '↻ Çevir' : ent.kind === 'door' ? (ent.on ? 'Başta: açık' : 'Başta: kapalı') : (ent.on ? 'Başta: yukarıda' : 'Başta: aşağıda');
    codeHead.replaceChildren(
      h('span', { class: 'tool-art', html: PIECES[ent.kind].art() }),
      h('b', { text: KIND_NAMES[ent.kind] }),
      h('button', { class: 'btn small', text: flip, onclick: () => { if (ent.kind === 'monster') ent.dir = (ent.dir + 1) % 4; else ent.on = !ent.on; changed(); mode(); } }),
      h('button', { class: 'btn small danger', text: 'Kaldır', onclick: () => { castle.ents.splice(sel, 1); sel = -1; changed(); mode(); } }),
      h('button', { class: 'btn small go', text: 'Tamam', onclick: () => { sel = -1; tool = 'select'; refresh(); mode(); } }),
    );
    editor.load({ prog: parseProg(ent.prog), tools: toolsFor(ent.kind, open) });
    setMsg(`${KIND_NAMES[ent.kind]} için program yaz. Bitince «Tamam».`);
    fit();
  }

  function changed() {
    castle.proven = false;
    ctx.save();
    refresh();
  }

  function onChange(prog) {
    const ent = castle.ents[sel];
    if (!ent) return;
    ent.prog = printProg(prog);
    changed();
  }

  function onCell(x, y, ev, dragging) {
    const at = castle.ents.findIndex((e) => e.x === x && e.y === y);
    if (tool === 'select' || (sel >= 0 && !dragging)) {
      if (dragging) return;
      if (at === sel && at >= 0) return;
      sel = at; tool = 'select';
      if (at >= 0) sfx('tap');
      refresh(); mode();
      return;
    }
    // Sürükleyerek yalnız duvar örülür ve silinir; öteki parçalar tek tek konur.
    if (dragging && !(tool === 'wall' || tool === 'erase')) return;
    const res = paint(castle, tool, x, y, open);
    if (res.error && !dragging) setMsg(res.error, 'bad');
    if (!res.ok) return;
    sfx('tap');
    if (res.ent) { sel = castle.ents.indexOf(res.ent); tool = 'select'; ctx.save(); refresh(); mode(); return; }
    ctx.save();
    refresh();
  }

  async function rename() {
    const name = await ask({ title: 'Kalenin adı', input: castle.name, ok: 'Kaydet', extra: { text: 'Bu kaleyi sil', value: DELETE } });
    if (name === DELETE) {
      if (await ask({ title: 'Kale silinsin mi?', text: `«${castle.name}» geri gelmez.`, ok: 'Sil', danger: true })) { ctx.deleteCastle(castle); ctx.back('atolye'); }
      return;
    }
    if (!name) return;
    castle.name = name.replace(/[<>\u0000-\u001f]/g, '').slice(0, 24) || castle.name;
    ctx.save();
    refresh();
  }

  function fit() {
    if (!level) return;
    const wide = getComputedStyle(stage.parentElement).flexDirection === 'row';
    const availW = stage.clientWidth - 20;
    const availH = wide ? stage.clientHeight - msg.offsetHeight - 28 : Math.round(window.innerHeight * (sel >= 0 ? 0.28 : 0.56));
    const cell = Math.max(18, Math.min(64, Math.floor(Math.min(availW / level.w, availH / level.h))));
    board.setCell(cell);
  }

  refresh();
  mode();
  return { el, fit };
}
