// Çizimler: her şey küçük, elle yazılmış SVG. Resim dosyası yok; her ekranda keskin durur.
// Robot tepeden görünür ve baktığı yöne döndürülür: kafası, kolları ve sarı ışığı önündedir.
// Yüzünde yalnız yuvarlak gözler vardır; böylece aşağı bakarken "baş aşağı" görünmez.

export const GUARD_COLORS = ['#8b5cf6', '#1fae7a', '#f2784b', '#3b9ae8', '#e85d9b', '#c9a227'];
const svg = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;

export const guard = (color = GUARD_COLORS[0]) => svg(`
  <rect x="4.5" y="15" width="9" height="28" rx="4" fill="#2a2d44"/><rect x="34.5" y="15" width="9" height="28" rx="4" fill="#2a2d44"/>
  <path d="M6 22h6M6 28h6M6 34h6M6 40h6M36 22h6M36 28h6M36 34h6M36 40h6" stroke="#6a7090" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="10" y="16" width="28" height="28" rx="8" fill="${color}" stroke="#0005" stroke-width="1.2"/>
  <rect x="15" y="29" width="18" height="10" rx="4" fill="#0003"/>
  <circle cx="20" cy="34" r="2" fill="#fff9"/><circle cx="28" cy="34" r="2" fill="#fff9"/>
  <rect x="6.5" y="5" width="6" height="12" rx="3" fill="#aab1c6" stroke="#5d6480" stroke-width="1"/><rect x="35.5" y="5" width="6" height="12" rx="3" fill="#aab1c6" stroke="#5d6480" stroke-width="1"/>
  <rect x="12" y="6" width="24" height="18" rx="8" fill="#e6e9f2" stroke="#7d859b" stroke-width="1.3"/>
  <rect x="15" y="9.5" width="18" height="9" rx="4.5" fill="#221c3a"/>
  <circle cx="20" cy="14" r="2.8" fill="#7df9ff"/><circle cx="28" cy="14" r="2.8" fill="#7df9ff"/>
  <path d="M24 6V3" stroke="#7d859b" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="24" cy="2.6" r="2.4" fill="#ffd04a" stroke="#a87b12" stroke-width=".8"/>`);

export const knight = () => svg(`
  <ellipse cx="24" cy="43.5" rx="11" ry="3" fill="#0003"/>
  <path d="M24 10C29 0 39 3 36 13 32 8 28 9 24 13z" fill="#e5484d" stroke="#0004" stroke-width="1"/>
  <rect x="15" y="27" width="18" height="15" rx="5" fill="#4a6fd6" stroke="#0005" stroke-width="1.2"/>
  <circle cx="24" cy="20" r="11.5" fill="#d9deea" stroke="#7d859b" stroke-width="1.5"/>
  <rect x="15.5" y="17" width="17" height="6" rx="2.6" fill="#2a2d44"/>
  <circle cx="20.5" cy="20" r="1.4" fill="#fff"/><circle cx="27.5" cy="20" r="1.4" fill="#fff"/>
  <path d="M30 29h11v6q0 6-5.5 8.5Q30 41 30 35z" fill="#f4c542" stroke="#a87b12" stroke-width="1.3"/>`);

export const chest = () => svg(`
  <ellipse cx="24" cy="41.5" rx="16" ry="3" fill="#0003"/>
  <rect x="8" y="21" width="32" height="19" rx="3" fill="#9a5b2c" stroke="#55300f" stroke-width="1.5"/>
  <path class="lid" d="M8 22q0-12 16-12t16 12z" fill="#b8733a" stroke="#55300f" stroke-width="1.5"/>
  <rect x="21" y="10.5" width="6" height="29" fill="#f4c542"/><rect x="8.7" y="21" width="30.6" height="3.6" fill="#f4c542"/>
  <circle cx="24" cy="28" r="3.3" fill="#55300f"/>`);

export const coin = () => svg(`
  <circle cx="24" cy="25" r="10.5" fill="#ffd04a" stroke="#a87b12" stroke-width="2"/>
  <circle cx="24" cy="25" r="6" fill="none" stroke="#fff8" stroke-width="2"/>
  <path d="M17 19l3-3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`);

export const key = () => svg(`
  <g fill="none" stroke-linecap="round" stroke="#8a6410" stroke-width="7"><circle cx="16" cy="24" r="6.5"/><path d="M23 24h17M35 24v6M40 24v5"/></g>
  <g fill="none" stroke-linecap="round" stroke="#ffd04a" stroke-width="4"><circle cx="16" cy="24" r="6.5"/><path d="M23 24h17M35 24v6M40 24v5"/></g>`);

export const plate = () => svg(`
  <rect x="8" y="8" width="32" height="32" rx="7" fill="#8f8caa" stroke="#55517a" stroke-width="2"/>
  <rect class="cap" x="14" y="14" width="20" height="20" rx="5" fill="#e5484d" stroke="#9c2b30" stroke-width="2"/>`);

export const flag = () => svg(`
  <ellipse cx="16" cy="41" rx="8" ry="2.6" fill="#0003"/>
  <rect x="14" y="7" width="3.6" height="34" rx="1.8" fill="#6b5a3a"/>
  <path class="cloth" d="M17.6 8.5 39 16 17.6 24.5z" fill="#e5484d" stroke="#0004" stroke-width="1"/>`);

export const door = () => svg(`
  <rect x="2" y="2" width="44" height="44" rx="4" fill="#3a2a1c"/>
  <g class="leaf">
    <rect x="4" y="4" width="40" height="40" rx="3" fill="#9a5f30" stroke="#4e2e12" stroke-width="1.5"/>
    <path d="M14 4v40M24 4v40M34 4v40" stroke="#4e2e12" stroke-width="1.2"/>
    <rect x="4" y="11" width="40" height="5" fill="#4b4f63"/><rect x="4" y="32" width="40" height="5" fill="#4b4f63"/>
    <circle cx="36" cy="24" r="3.2" fill="none" stroke="#f4c542" stroke-width="2"/>
  </g>`);

const TIP_AT = [12, 24, 36];
export const spikes = () => svg(`
  <rect x="5" y="5" width="38" height="38" rx="5" fill="#77738f" stroke="#4d496b" stroke-width="2"/>
  ${TIP_AT.flatMap((y) => TIP_AT.map((x) => `<circle cx="${x}" cy="${y + 2}" r="2.6" fill="#3c3856"/>`)).join('')}
  <g class="tips">${TIP_AT.flatMap((y) => TIP_AT.map((x) => `<path d="M${x - 5} ${y + 5}L${x} ${y - 7}l5 12z" fill="#eef1f7" stroke="#6b7186" stroke-width="1"/>`)).join('')}</g>`);

export const wall = () => svg(`
  <rect x="1" y="1" width="46" height="46" rx="5" fill="#77719a"/>
  <path d="M1 17h46M1 32h46M16 1v16M34 1v16M24 17v15M10 32v15M38 32v15" stroke="#55507a" stroke-width="2"/>
  <rect x="1" y="1" width="46" height="5" rx="2.5" fill="#fff2"/>`);

export const eraser = () => svg(`
  <path d="M13 13l22 22M35 13L13 35" stroke="#ff8a8a" stroke-width="6" stroke-linecap="round"/>`);

export const hand = () => svg(`
  <path d="M19 26V11a3 3 0 0 1 6 0v10l9 2a5 5 0 0 1 4 5v5q0 9-9 9h-5q-5 0-8-5l-5-9a3 3 0 0 1 5-3z" fill="#fff" stroke="#2a2644" stroke-width="2.2" stroke-linejoin="round"/>`);

/** Atölye paletindeki parçalar: ad ve çizim. */
export const PIECES = {
  select: { label: 'Seç', art: hand },
  wall: { label: 'Duvar', art: wall },
  erase: { label: 'Sil', art: eraser },
  knight: { label: 'Şövalye', art: knight },
  chest: { label: 'Hazine', art: chest },
  guard: { label: 'Robot', art: () => guard(GUARD_COLORS[0]) },
  coin: { label: 'Altın', art: coin },
  spikes: { label: 'Diken', art: spikes },
  door: { label: 'Kapı', art: door },
  key: { label: 'Anahtar', art: key },
  plate: { label: 'Düğme', art: plate },
};

// ── düğme ve blok ikonları ──
// Kalın çizgili, tek renkli: rengi içinde durduğu yazıdan alır. Yazı işaretleri (↑ ↶ ▶ …) yerine
// bunlar kullanılır: yazı tipine göre incelip kalınlaşmazlar, küçük boyda da seçilirler.
const full = (w = 2) => `fill="currentColor" stroke-width="${w}"`;
const SPEAKER = `<path ${full()} d="M3.5 9.5H7L12.5 5v14L7 14.5H3.5z"/>`;
const ICONS = {
  back: '<path d="M15 4.5 7.5 12l7.5 7.5"/>',
  arrowU: '<path d="M12 20V5M5.5 11.5 12 5l6.5 6.5"/>',
  arrowD: '<path d="M12 4v15M5.5 12.5 12 19l6.5-6.5"/>',
  arrowL: '<path d="M20 12H5M11.5 5.5 5 12l6.5 6.5"/>',
  arrowR: '<path d="M4 12h15M12.5 5.5 19 12l-6.5 6.5"/>',
  dash: '<path d="M6 12 12 6l6 6M6 19.5l6-6 6 6"/>',
  // Dönüş ikonları ekranda görülen dönüşün kendisidir: robot nereye bakarsa baksın
  // "sola dön" onu saatin tersine, "sağa dön" saat yönünde çevirir.
  turnL: `<path d="M5.94 16A7 7 0 1 0 8.5 6.44"/><path ${full(1.2)} d="M3.7 9.2 11.1 9.9 6.8 2.5z"/>`,
  turnR: `<path d="M18.06 16A7 7 0 1 1 15.5 6.44"/><path ${full(1.2)} d="M20.3 9.2 12.9 9.9 17.2 2.5z"/>`,
  wait: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2.5"/>',
  honk: `${SPEAKER}<path d="M16.5 8.5a5 5 0 0 1 0 7"/>`,
  alarm: `<path ${full()} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10.5 21.5h3"/>`,
  open: `<path d="M5 20.5v-17h14v17"/><path ${full()} d="M5 3.5 11 6.5V21l-6-.5z"/>`,
  close: `<rect ${full()} x="5.5" y="3.5" width="13" height="17" rx="1.5"/><circle cx="15" cy="12.5" r="1.4" fill="#0009" stroke="none"/>`,
  spikesUp: `<path ${full()} d="M3 19.5 7.5 6.5 12 19.5 16.5 6.5 21 19.5z"/>`,
  spikesDown: '<path d="M3 17h18"/><path stroke-width="2.6" d="M7.5 12.5v-.01M12 12.5v-.01M16.5 12.5v-.01"/>',
  repeat: '<g stroke-width="2.8"><path d="M16.5 2.5 20 6l-3.5 3.5"/><path d="M4 11.5V9a3 3 0 0 1 3-3h12.5"/><path d="M7.5 21.5 4 18l3.5-3.5"/><path d="M20 12.5V15a3 3 0 0 1-3 3H4.5"/></g>',
  forever: '<path stroke-width="2.8" d="M12 12c-1.8-2.4-3.3-4-5.5-4a4 4 0 0 0 0 8c2.2 0 3.7-1.6 5.5-4zm0 0c1.8 2.4 3.3 4 5.5 4a4 4 0 0 0 0-8c-2.2 0-3.7 1.6-5.5 4z"/>',
  ask: '<path d="M8 8.5a4 4 0 1 1 6.5 3.1c-1.5 1.2-2.5 1.9-2.5 3.7"/><path stroke-width="3.8" d="M12 20.3v.01"/>',
  bolt: `<path ${full(1.6)} d="M13.5 2.5 5 13.5h5.5l-1 8 8.5-11h-5.5z"/>`,
  play: `<path ${full(2.4)} d="M7.5 5v14l11-7z"/>`,
  stop: `<rect ${full(2.4)} x="6.5" y="6.5" width="11" height="11" rx="1"/>`,
  step: `<path ${full(2.4)} d="M5.5 6v12l8.5-6z"/><path d="M18.5 5.5v13"/>`,
  undo: '<path d="M8.5 5 4 9.5 8.5 14"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  trash: '<g stroke-width="2.6"><path d="M4.5 7h15M9.5 7V4h5v3M6.5 7l1 13.5h9l1-13.5"/></g>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5 10 17.5 19.5 7"/>',
  pencil: '<path stroke-width="2.6" d="M5 19l1-4.5L16.5 4 20 7.5 9.5 18z"/>',
  share: '<path stroke-width="2.8" d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 13v7.5h14V13"/>',
  sound: `${SPEAKER}<path d="M16.5 8.5a5 5 0 0 1 0 7"/>`,
  mute: `${SPEAKER}<path stroke-width="2.6" d="M16 9.5l5 5M21 9.5l-5 5"/>`,
};
ICONS.fwd = ICONS.arrowU;
ICONS.reset = ICONS.turnL;

/** Adı verilen ikonun SVG'si (ad tanınmıyorsa boş bir kutu). */
export const icon = (name) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
