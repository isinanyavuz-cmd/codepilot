// Şövalye Kalesi: giriş. Ekranlar arasında adres çubuğundaki "#…" ile gezilir; böylece telefonun
// geri tuşu da bir önceki ekrana döner.
//   #            ana ekran          #okul        ders listesi       #ders/4     ders
//   #atolye      kale listesi       #kur/k3      kale kurma         #oyna/k3    kendi kaleni dene
//   #ornek/0     örnek kale         #k=…         bağlantıyla gelen kale
// Adresin sonuna ?hepsi eklenirse bütün dersler ve parçalar açılır (gözden geçirmek için; kayda yazılmaz).
import { unlocks, GIVES } from './bloklar.js';
import { LESSONS, lessonById } from './dersler.js';
import { newCastle, checkCastle, encodeCastle, decodeCastle, masterChecks, SAMPLES } from './kaleler.js';
import { load, save } from './kayit.js';
import { lessonScreen } from './ders.js';
import { workshopScreen, buildScreen } from './atolye.js';
import { playScreen } from './oyna.js';
import { h, ic, ask, toast, topbar, sheet } from './arayuz.js';
import { sfx, setSound } from './ses.js';
import * as art from './cizim.js';

const root = document.getElementById('app');
const ALL = new URLSearchParams(location.search).has('hepsi');
const data = load();
setSound(data.sound);

const trail = [];          // bu oturumda gezilen adresler: "geri" tarayıcı geçmişiyle aynı yöne gitsin
let current = null;

const ctx = {
  data, all: ALL,
  save: () => { if (!ALL) save(data); },
  open: () => unlocks(ALL ? 'all' : data.done),
  isDone: (id) => ALL || data.done.includes(id),
  go: (hash) => { location.hash = hash; },
  /** Bir önceki ekrana döner; oraya bu oturumda gelinmediyse üst ekrana gider. */
  back(parent) {
    if (trail.length > 1 && trail[trail.length - 2] === parent) history.back();
    else location.replace(`${location.pathname}${location.search}#${parent}`);
  },
  finishLesson(id) {
    if (ALL || data.done.includes(id)) return;
    data.done.push(id);
    save(data);
  },
  newCastle() {
    const c = newCastle(`k${data.next}`, `Kale ${data.next}`, ctx.open());
    data.next++;
    data.castles.push(c);
    ctx.save();
    return c;
  },
  /** Örnek ya da bağlantıyla gelen kaleyi atölyeye kopyalar ve açar. */
  copyCastle(source) {
    const c = { ...checkCastle(source), id: `k${data.next}`, proven: false, shared: false };
    data.next++;
    data.castles.push(c);
    ctx.save();
    toast('Kopyalandı: artık senin kalen.');
    ctx.go(`kur/${c.id}`);
  },
  deleteCastle(castle) {
    data.castles = data.castles.filter((c) => c !== castle);
    ctx.save();
  },
  /** Kaleyi kuran onu kendisi bitirdi: çözülebildiği kanıtlandı. İlk kez kanıtlandıysa true. */
  prove(castle) {
    const first = !castle.proven;
    castle.proven = true;
    ctx.save();
    return first;
  },
  /** Kanıtlanmış kaleyi bağlantı olarak paylaşır. */
  async share(castle) {
    if (!castle.proven) {
      await ask({ title: 'Önce kendin bitir', text: 'Paylaşmadan önce kalenin çözülebildiğini kanıtla: «Oyna»ya bas ve hazineye ulaş.', cancel: null });
      return;
    }
    const url = `${location.origin}${location.pathname}#k=${encodeCastle(castle)}`;
    const done = () => { castle.shared = true; ctx.save(); celebrate(); };
    try {
      if (navigator.share) { await navigator.share({ title: 'Şövalye Kalesi', text: `«${castle.name}» kaleme girebilir misin?`, url }); done(); return; }
      await navigator.clipboard.writeText(url);
      toast('Bağlantı kopyalandı: istediğine gönder.');
      done();
    } catch (err) {
      if (err && err.name === 'AbortError') return;                 // paylaşım penceresi kapatıldı
      await ask({ title: 'Bağlantıyı kopyala', text: 'Bu bağlantıyı açan herkes kaleni oynar.', input: url, max: 8000, ok: 'Tamam', cancel: null });
      done();
    }
  },
};

/** Usta işinin dört maddesi de tamamlandıysa bir kez kutlar. */
function celebrate() {
  if (data.master || !masterChecks(data.castles).every((c) => c.done)) return;
  data.master = true;
  ctx.save();
  sfx('win');
  const s = sheet([
    h('div', { class: 'sheet-title big', text: 'Kale Ustası oldun!' }),
    h('p', { class: 'sheet-text', text: 'Kendi kaleni kurdun, programladın, bitirdin ve birine oynattın.' }),
    h('div', { class: 'row' }, h('button', { class: 'btn go', text: 'Tamam', onclick: () => s.close() })),
  ], { cls: 'result' });
}

const nextLesson = () => LESSONS.find((l) => !ctx.isDone(l.id)) || null;
const lessonOpen = (id) => ALL || id === 1 || data.done.includes(id - 1) || data.done.includes(id);

function homeScreen() {
  const open = ctx.open(), next = ALL ? null : nextLesson(), done = ALL ? LESSONS.length : data.done.length;
  const soundFace = () => [ic(data.sound ? 'sound' : 'mute'), data.sound ? 'Ses: açık' : 'Ses: kapalı'];
  const soundBtn = h('button', { class: 'btn small ghost', onclick: () => { data.sound = !data.sound; setSound(data.sound); ctx.save(); soundBtn.replaceChildren(...soundFace()); sfx('tap'); } }, soundFace());
  const el = h('div', { class: 'screen home' },
    h('div', { class: 'scroll' },
      h('div', { class: 'hero' },
        h('div', { class: 'hero-art' },
          h('span', { class: 'a m1', html: art.guard(art.GUARD_COLORS[0]) }),
          h('span', { class: 'a ch', html: art.chest() }),
          h('span', { class: 'a m2', html: art.guard(art.GUARD_COLORS[1]) }),
          h('span', { class: 'a kn', html: art.intruder() })),
        h('h1', { class: 'logo', text: 'Şövalye Kalesi' }),
        h('p', { class: 'tagline', text: data.master ? 'Hoş geldin, Kale Ustası!' : 'Şövalyelerini programla, kaleni kur, hazineni koru.' })),
      next && h('button', { class: 'card big go', onclick: () => ctx.go(`ders/${next.id}`) },
        h('span', { class: 'card-title', text: done ? 'Devam et' : 'Başla' }),
        h('span', { class: 'card-sub', text: `${next.id}. ders: ${next.title}` })),
      h('button', { class: 'card big', onclick: () => ctx.go('okul') },
        h('span', { class: 'card-title', text: 'Şövalye Okulu' }),
        h('span', { class: 'card-sub', text: `${done} / ${LESSONS.length} ders` }),
        h('span', { class: 'bar' }, h('span', { style: `width:${Math.round((done / LESSONS.length) * 100)}%` }))),
      h('button', { class: `card big ${open.workshop ? '' : 'locked'}`, onclick: () => (open.workshop ? ctx.go('atolye') : toast('Atölye 3. dersten sonra açılır.')) },
        h('span', { class: 'card-title', text: 'Atölye' }),
        h('span', { class: 'card-sub', text: open.workshop ? 'Kendi kaleni kur, birine oynat.' : '3. dersten sonra açılır.' })),
      h('div', { class: 'foot' }, soundBtn)));
  return { el };
}

function schoolScreen() {
  const el = h('div', { class: 'screen' },
    topbar('Şövalye Okulu', { onBack: () => ctx.back('') }),
    h('div', { class: 'scroll' },
      h('p', { class: 'note', text: 'Her ders kısa bir iştir ve atölyeye yeni bir blok ya da parça açar.' }),
      h('div', { class: 'lessons' }, LESSONS.map((l) => {
        const done = ctx.isDone(l.id), can = lessonOpen(l.id), give = GIVES[l.id];
        return h('button', { class: `lesson ${done ? 'done' : can ? 'open' : 'locked'}`, onclick: () => (can ? ctx.go(`ders/${l.id}`) : toast('Önce bir önceki dersi bitir.')) },
          h('span', { class: 'lesson-no' }, done ? ic('check') : String(l.id)),
          h('span', { class: 'lesson-title', text: `${l.id}. ${l.title}` }),
          h('span', { class: 'lesson-give', text: give ? `Açar: ${give.tag}` : '' }));
      }))));
  return { el };
}

function route() {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (trail.length > 1 && trail[trail.length - 2] === hash) trail.pop();
  else if (trail[trail.length - 1] !== hash) trail.push(hash);
  if (current && current.destroy) current.destroy();
  document.querySelectorAll('.veil').forEach((n) => n.remove());

  const [name, arg] = hash.split('/');
  const castle = () => data.castles.find((c) => c.id === arg);
  let screen = null;
  try {
    if (hash.startsWith('k=')) screen = playScreen(ctx, { castle: decodeCastle(hash.slice(2)), source: 'shared', back: '' });
    else if (name === 'okul') screen = schoolScreen();
    else if (name === 'ders' && lessonById(arg) && lessonOpen(Number(arg))) screen = lessonScreen(ctx, lessonById(arg));
    else if (name === 'ornek' && SAMPLES[arg]) screen = playScreen(ctx, { castle: SAMPLES[arg], source: 'sample', back: 'atolye', sampleIndex: Number(arg) });
    else if (ctx.open().workshop) {
      if (name === 'atolye') screen = workshopScreen(ctx);
      else if (name === 'kur' && castle()) screen = buildScreen(ctx, castle());
      else if (name === 'oyna' && castle()) screen = playScreen(ctx, { castle: castle(), source: 'own', back: `kur/${arg}` });
    }
  } catch (err) {
    toast(err && err.message ? err.message : 'Bir şey ters gitti.');
  }
  current = screen || homeScreen();
  root.replaceChildren(current.el);
  if (current.fit) current.fit();
}

window.addEventListener('hashchange', route);
window.addEventListener('resize', () => { if (current && current.fit) current.fit(); });
// İlk dokunuşta ses açılır (tarayıcılar dokunmadan ses çalmaz).
document.addEventListener('pointerdown', () => sfx(''), { once: true });
route();

// Yayında çevrimdışı da açılsın; geliştirirken eski dosya sunmasın diye yerelde kurulmaz.
if ('serviceWorker' in navigator && !/^(localhost|127\.|\[::1\])/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});

// Denemek ve hata ayıklamak için.
window.__kale = { ctx, data, get current() { return current; } };
