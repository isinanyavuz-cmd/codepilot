// Çizimler: her şey küçük, elle yazılmış SVG. Resim dosyası yok; her ekranda keskin durur.
// Canavar tepeden görünür ve baktığı yöne döndürülür: boynuzları ve gözleri önündedir.

export const MONSTER_COLORS = ['#8b5cf6', '#1fae7a', '#f2784b', '#3b9ae8', '#e85d9b', '#c9a227'];
const svg = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;

export const monster = (color = MONSTER_COLORS[0]) => svg(`
  <ellipse cx="24" cy="43" rx="4.5" ry="3.5" fill="${color}"/><ellipse cx="24" cy="43" rx="4.5" ry="3.5" fill="#0004"/>
  <path d="M12 17 9 4l10 8zM36 17 39 4 29 12z" fill="#fff3d6" stroke="#0005" stroke-width="1"/>
  <ellipse cx="24" cy="26" rx="16" ry="17" fill="${color}" stroke="#0005" stroke-width="1.2"/>
  <ellipse cx="24" cy="32" rx="10" ry="8" fill="#fff2"/>
  <circle cx="17.5" cy="20" r="6" fill="#fff"/><circle cx="30.5" cy="20" r="6" fill="#fff"/>
  <circle cx="17.5" cy="18" r="2.9" fill="#221c3a"/><circle cx="30.5" cy="18" r="2.9" fill="#221c3a"/>
  <path d="M17 31q7 6 14 0" fill="none" stroke="#221c3a" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M20.5 33.2l1.6 3 1.6-2.6zM24.6 33.6l1.6 2.6 1.6-3z" fill="#fff"/>`);

export const knight = () => svg(`
  <ellipse cx="24" cy="43.5" rx="11" ry="3" fill="#0003"/>
  <path d="M24 10C29 0 39 3 36 13 32 8 28 9 24 13z" fill="#e5484d" stroke="#0004" stroke-width="1"/>
  <rect x="15" y="27" width="18" height="15" rx="5" fill="#4a6fd6" stroke="#0005" stroke-width="1.2"/>
  <circle cx="24" cy="20" r="11.5" fill="#d9deea" stroke="#7d859b" stroke-width="1.5"/>
  <rect x="15.5" y="17" width="17" height="6" rx="2.6" fill="#2a2d44"/>
  <circle cx="20.5" cy="20" r="1.4" fill="#fff"/><circle cx="27.5" cy="20" r="1.4" fill="#fff"/>
  <path d="M30 29h11v6q0 6-5.5 8.500Q30 41 30 35z" fill="#f4c542" stroke="#a87b12" stroke-width="1.3"/>`);

export const chest = () => svg(`
  <ellipse cx="24" cy="41.500" rx="16" ry="3" fill="#0003"/>
  <rect x="8" y="21" width="32" height="19" rx="3" fill="#9a5b2c" stroke="#55300f" stroke-width="1.5"/>
  <path class="lid" d="M8 22q0-12 16-12t16 12z" fill="#b8733a" stroke="#55300f" stroke-width="1.5"/>
  <rect x="21" y="10.500" width="6" height="29" fill="#f4c542"/><rect x="8.700" y="21" width="30.600" height="3.600" fill="#f4c542"/>
  <circle cx="24" cy="28" r="3.300" fill="#55300f"/>`);

export const coin = () => svg(`
  <circle cx="24" cy="25" r="10.500" fill="#ffd04a" stroke="#a87b12" stroke-width="2"/>
  <circle cx="24" cy="25" r="6" fill="none" stroke="#fff8" stroke-width="2"/>
  <path d="M17 19l3-3" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/>`);

export const key = () => svg(`
  <g fill="none" stroke-linecap="round" stroke="#8a6410" stroke-width="7"><circle cx="16" cy="24" r="6.500"/><path d="M23 24h17M35 24v6M40 24v5"/></g>
  <g fill="none" stroke-linecap="round" stroke="#ffd04a" stroke-width="4"><circle cx="16" cy="24" r="6.500"/><path d="M23 24h17M35 24v6M40 24v5"/></g>`);

export const plate = () => svg(`
  <rect x="8" y="8" width="32" height="32" rx="7" fill="#8f8caa" stroke="#55517a" stroke-width="2"/>
  <rect class="cap" x="14" y="14" width="20" height="20" rx="5" fill="#e5484d" stroke="#9c2b30" stroke-width="2"/>`);

export const flag = () => svg(`
  <ellipse cx="16" cy="41" rx="8" ry="2.600" fill="#0003"/>
  <rect x="14" y="7" width="3.600" height="34" rx="1.800" fill="#6b5a3a"/>
  <path class="cloth" d="M17.600 8.500 39 16 17.600 24.500z" fill="#e5484d" stroke="#0004" stroke-width="1"/>`);

export const door = () => svg(`
  <rect x="2" y="2" width="44" height="44" rx="4" fill="#3a2a1c"/>
  <g class="leaf">
    <rect x="4" y="4" width="40" height="40" rx="3" fill="#9a5f30" stroke="#4e2e12" stroke-width="1.500"/>
    <path d="M14 4v40M24 4v40M34 4v40" stroke="#4e2e12" stroke-width="1.200"/>
    <rect x="4" y="11" width="40" height="5" fill="#4b4f63"/><rect x="4" y="32" width="40" height="5" fill="#4b4f63"/>
    <circle cx="36" cy="24" r="3.200" fill="none" stroke="#f4c542" stroke-width="2"/>
  </g>`);

const TIP_AT = [12, 24, 36];
export const spikes = () => svg(`
  <rect x="5" y="5" width="38" height="38" rx="5" fill="#77738f" stroke="#4d496b" stroke-width="2"/>
  ${TIP_AT.flatMap((y) => TIP_AT.map((x) => `<circle cx="${x}" cy="${y + 2}" r="2.600" fill="#3c3856"/>`)).join('')}
  <g class="tips">${TIP_AT.flatMap((y) => TIP_AT.map((x) => `<path d="M${x - 5} ${y + 5}L${x} ${y - 7}l5 12z" fill="#eef1f7" stroke="#6b7186" stroke-width="1"/>`)).join('')}</g>`);

export const wall = () => svg(`
  <rect x="1" y="1" width="46" height="46" rx="5" fill="#77719a"/>
  <path d="M1 17h46M1 32h46M16 1v16M34 1v16M24 17v15M10 32v15M38 32v15" stroke="#55507a" stroke-width="2"/>
  <rect x="1" y="1" width="46" height="5" rx="2.500" fill="#fff2"/>`);

export const eraser = () => svg(`
  <path d="M13 13l22 22M35 13L13 35" stroke="#ff8a8a" stroke-width="6" stroke-linecap="round"/>`);

export const hand = () => svg(`
  <path d="M19 26V11a3 3 0 0 1 6 0v10l9 2a5 5 0 0 1 4 5v5q0 9-9 9h-5q-5 0-8-5l-5-9a3 3 0 0 1 5-3z" fill="#fff" stroke="#2a2644" stroke-width="2.200" stroke-linejoin="round"/>`);

/** Atölye paletindeki parçalar: ad ve çizim. */
export const PIECES = {
  select: { label: 'Seç', art: hand },
  wall: { label: 'Duvar', art: wall },
  erase: { label: 'Sil', art: eraser },
  knight: { label: 'Şövalye', art: knight },
  chest: { label: 'Hazine', art: chest },
  monster: { label: 'Canavar', art: () => monster(MONSTER_COLORS[0]) },
  coin: { label: 'Altın', art: coin },
  spikes: { label: 'Diken', art: spikes },
  door: { label: 'Kapı', art: door },
  key: { label: 'Anahtar', art: key },
  plate: { label: 'Düğme', art: plate },
};
