// 3B modeller: gemi, meteor, kristal. Hepsi kodla üretilir; dışarıdan dosya yüklenmez.
import * as THREE from '../../vendor/three.bundle.min.js';

// Gemi malzemeleri. Gövde rengi ve ışık şeridi rengi hangardan gelir (bkz. styleShip).
const hull = new THREE.MeshStandardMaterial({ color: 0x808a9a, roughness: 0.6, metalness: 0.35, flatShading: true });
const dark = new THREE.MeshStandardMaterial({ color: 0x465063, roughness: 0.55, metalness: 0.4, flatShading: true, side: THREE.DoubleSide });
const panel = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide });
const glass = new THREE.MeshStandardMaterial({ color: 0x060a14, roughness: 0.06, metalness: 0.85, emissive: 0x0b2f6a, emissiveIntensity: 0.12 });
const bright = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
const accent = new THREE.MeshBasicMaterial({ color: bright(0x4fb4ff, 2.2), side: THREE.DoubleSide });
const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

let haloTexture = null;
const haloTex = () => (haloTexture ??= glowTexture());

function wingShape(pts, mirror) {
  const s = new THREE.Shape();
  const p = mirror ? pts.map(([x, y]) => [-x, y]).reverse() : pts;
  s.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) s.lineTo(p[i][0], p[i][1]);
  s.closePath();
  return s;
}
function slab(shape, depth, mat, bevel = 0.015) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
  const m = new THREE.Mesh(g, mat);
  m.rotation.x = -Math.PI / 2; m.position.y = -depth / 2;
  return m;
}

const lamp = (hex, k = 3) => new THREE.MeshBasicMaterial({ color: bright(hex, k) });

/**
 * Kesitlerden köşeli gövde. Her kesit { z, pts } biçimindedir; pts sağ yarının [x, y] noktalarıdır
 * (üst ortadan alt ortaya), sol yarı aynalanır. Yüzeyler düz gölgelenir: zırh plakası görünümü.
 */
function loft(stations, mat) {
  const rings = stations.map(({ z, pts }) => [...pts, ...pts.slice(1, -1).reverse().map(([x, y]) => [-x, y])].map(([x, y]) => [x, y, z]));
  const v = [], n = rings[0].length, tri = (a, b, c) => v.push(...a, ...b, ...c);
  for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < n; k++) {
    const a = rings[i][k], b = rings[i][(k + 1) % n], c = rings[i + 1][k], d = rings[i + 1][(k + 1) % n];
    tri(a, b, c); tri(b, d, c);
  }
  const first = rings[0], last = rings[rings.length - 1];
  for (let k = 1; k + 1 < n; k++) { tri(first[0], first[k + 1], first[k]); tri(last[0], last[k], last[k + 1]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
/** Kesitleri z'ye göre aradeğerler: gövdenin o noktadaki sağ yarı noktaları. */
function sectionAt(stations, z) {
  let i = 0; while (i + 2 < stations.length && stations[i + 1].z < z) i++;
  const a = stations[i], b = stations[i + 1], t = Math.min(1, Math.max(0, (z - a.z) / (b.z - a.z)));
  return a.pts.map(([x, y], k) => [x + (b.pts[k][0] - x) * t, y + (b.pts[k][1] - y) * t]);
}
/**
 * Gövdenin bir yüzüne yapışık ince plaka (koyu panel ya da ışık şeridi): `k`. ve `k+1`. kesit noktaları
 * arasındaki yüzde, z0–z1 boyunca, yüzün t0–t1 dilimini kaplar. `side` = 1 sağ, -1 sol.
 */
function plate(stations, z0, z1, k, t0, t1, mat, side, lift = 1.035) {
  const v = [], N = 6, at = (z, t) => { const p = sectionAt(stations, z), a = p[k], b = p[k + 1]; return [side * (a[0] + (b[0] - a[0]) * t) * lift, (a[1] + (b[1] - a[1]) * t) * lift + 0.002, z]; };
  for (let i = 0; i < N; i++) {
    const za = z0 + (z1 - z0) * i / N, zb = z0 + (z1 - z0) * (i + 1) / N;
    const a = at(za, t0), b = at(za, t1), c = at(zb, t0), d = at(zb, t1);
    v.push(...a, ...b, ...c, ...b, ...d, ...c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
/** Boyuna ekseni z olan silindir/koni parçası: z0'da r0, z1'de r1 yarıçaplı. */
const tube = (r0, r1, z0, z1, mat, sides = 14, open = false) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, z1 - z0, sides, 1, open), mat);
  m.rotation.x = Math.PI / 2; m.position.z = (z0 + z1) / 2;
  return m;
};

// Gövde kesitleri (burun -z'de): [üst orta, üst kenar, omuz, yan kırım, alt kenar, alt orta]
const sec = (z, w, wt, top, ch, bot) => ({ z, pts: [[0, top], [wt, top], [(wt + w) / 2 + 0.012, (top + ch) / 2 + 0.022], [w, ch], [w * 0.55, bot], [0, bot]] });
const FUSELAGE = [
  sec(-1.06, 0.095, 0.05, 0.005, -0.035, -0.08),
  sec(-0.9, 0.14, 0.07, 0.06, -0.03, -0.105),
  sec(-0.62, 0.195, 0.095, 0.11, -0.025, -0.13),
  sec(-0.25, 0.245, 0.12, 0.15, -0.02, -0.14),
  sec(0.12, 0.265, 0.14, 0.16, -0.015, -0.14),
  sec(0.52, 0.25, 0.135, 0.155, -0.015, -0.13),
  sec(0.76, 0.18, 0.1, 0.115, -0.01, -0.08),
];
const hump = (z, w, top) => ({ z, pts: [[0, top], [w * 0.62, top], [w, 0.12], [0, 0.12]] });
const HUMP = [hump(-0.06, 0.07, 0.15), hump(0.06, 0.115, 0.235), hump(0.34, 0.115, 0.235), hump(0.5, 0.09, 0.18)];
// Kanat: gövdeye göre [x, ileri] noktaları; kök x = 0'dadır (grup gövde kenarına oturur).
const WING = [[-0.05, 0.18], [0.6, -0.28], [0.62, -0.6], [0.38, -0.57], [0.28, -0.63], [-0.05, -0.62]];
const WING_PANEL = [[0.0, -0.22], [0.36, -0.4], [0.36, -0.55], [0.28, -0.6], [0.0, -0.59]];
const TAIL = [[0.37, -0.6], [0.68, -0.83], [0.68, -0.94], [0.37, -0.9]];
const WINGLET = [[0.25, -0.07], [0.42, 0.19], [0.5, 0.235], [0.62, 0.24], [0.68, 0.2], [0.66, -0.07]];
const ROOT = 0.23, ENGINE_X = 0.285, ENGINE_Y = 0.19, ENGINE_Z = 0.13, SIZE = 0.9;

/**
 * Uzay gemisi; burnu -z yönüne (ekranda yukarı) bakar. Konsept görseldeki avcı gemisidir: köşeli zırh
 * plakalı uzun gövde, burunda ikiz namlu, koyu cam kokpit, geriye ok açılı kanatlar ve uçlarında dik
 * kanatçıklar, sırtta iki büyük motor, kanat ön kenarlarında ve gövde yanlarında ışık şeritleri.
 * `ghostMat` verilirse tek renkli hayalet üretir.
 */
export function buildShip(ghostMat = null) {
  const ship = new THREE.Group(), g = new THREE.Group();
  g.scale.setScalar(SIZE); ship.add(g);
  const H = ghostMat || hull, A = ghostMat || accent, D = ghostMat || dark, G = ghostMat || glass, P = ghostMat || panel;
  const detail = !ghostMat;
  // Gövde: gövde boyu seçimi (shape.nose) bu grubu z yönünde uzatır.
  const fus = new THREE.Group(); g.add(fus);
  fus.add(loft(FUSELAGE, H));
  // İkiz burun namlusu
  for (const s of [-1, 1]) {
    const gun = tube(0.022, 0.026, -1.15, -1.02, D, 8); gun.position.x = s * 0.055; gun.position.y = -0.04; fus.add(gun);
    if (detail) { const tip = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), A); tip.rotation.y = Math.PI; tip.position.set(s * 0.055, -0.04, -1.151); fus.add(tip); }
  }
  // Kokpit: uzun, koyu cam kubbe ve çerçevesi
  const can = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), G);
  can.scale.set(0.098, 0.095, 0.34); can.position.set(0, 0.11, -0.4); can.rotation.x = 0.13; fus.add(can);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 5, 28), D);
  frame.rotation.x = Math.PI / 2 + 0.13; frame.scale.set(0.103, 0.35, 0.12); frame.position.set(0, 0.113, -0.4); fus.add(frame);
  if (detail) for (const s of [-1, 1]) {
    // Yan gövdedeki koyu paneller, altlarında ışık şeridi; burun üstünde koyu ızgara
    fus.add(plate(FUSELAGE, -0.56, -0.24, 2, 0.12, 0.86, P, s), plate(FUSELAGE, -0.19, 0.12, 2, 0.12, 0.86, P, s));
    fus.add(plate(FUSELAGE, -0.6, 0.12, 2, 0.9, 1, A, s, 1.045), plate(FUSELAGE, -0.5, 0.05, 3, 0.1, 0.3, A, s, 1.045));
    fus.add(plate(FUSELAGE, -0.2, 0.06, 1, 0.1, 0.92, D, s, 1.02), plate(FUSELAGE, -0.98, -0.8, 1, 0.15, 0.9, D, s, 1.02), plate(FUSELAGE, 0.2, 0.6, 2, 0.5, 1, D, s, 1.02));
    fus.add(plate(FUSELAGE, -0.9, -0.76, 0, 0.25, 0.9, P, s), plate(FUSELAGE, -0.72, -0.69, 1, 0.1, 0.9, A, s, 1.045));
  }
  // Sırt bloğu (kokpitin arkası) ve üstündeki kapak
  g.add(loft(HUMP, H));
  g.add(box(0.12, 0.03, 0.17, D, 0, 0.245, 0.2));
  if (detail) g.add(box(0.05, 0.006, 0.012, A, 0, 0.262, 0.13));
  // Kuyruk ucu: iki motorun arasındaki koyu blok
  g.add(box(0.26, 0.14, 0.16, D, 0, 0.04, 0.8));

  const flames = [], wings = [], flameMats = [], halos = [];
  const addFlame = (x, y, z, r, len) => {
    if (ghostMat) return;
    const noz = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 20), lamp(0x8fd8ff, 3));
    noz.position.set(x, y, z - 0.03); g.add(noz);
    const flame = new THREE.Group(); flame.position.set(x, y, z);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(r, len, 16, 1, true), additive(bright(0x49c8ff, 1.6), 0.75));
    outer.rotation.x = Math.PI / 2; outer.position.z = len / 2; flame.add(outer); flameMats.push(outer.material);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, len * 0.52, 12, 1, true), additive(bright(0xffffff, 2.5), 0.9));
    inner.rotation.x = Math.PI / 2; inner.position.z = len * 0.26; flame.add(inner);
    g.add(flame); flames.push(flame);
    // Parlama efekti kapalıyken (düşük kalite) alevin çevresine konan yumuşak ışık; açıkken gizlenir.
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: 0x49c8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(x, y, z + 0.15); halo.scale.setScalar(len); halo.visible = false; g.add(halo); halos.push(halo);
  };
  for (const s of [-1, 1]) {
    // Motor: gövdenin omzuna oturan kalın silindir; önde zırh başlığı, arkada koyu lüle
    const eng = new THREE.Group(); eng.position.set(s * ENGINE_X, ENGINE_Y, ENGINE_Z); g.add(eng);
    eng.add(tube(0.055, 0.125, 0.06, 0.24, D, 10), tube(0.125, 0.125, 0.24, 0.4, D, 10), tube(0.115, 0.115, 0.4, 0.7, P, 14));
    eng.add(tube(0.131, 0.131, 0.44, 0.49, D, 14), tube(0.131, 0.131, 0.59, 0.64, D, 14));
    eng.add(tube(0.127, 0.105, 0.7, 0.88, P, 14, true));
    eng.add(box(0.12, 0.04, 0.2, H, 0, 0.112, 0.35), box(0.08, 0.03, 0.1, D, 0, 0.13, 0.54), box(0.035, 0.09, 0.24, D, s * 0.112, 0.01, 0.53));
    if (detail) eng.add(box(0.012, 0.012, 0.09, A, s * 0.04, 0.134, 0.33), tube(0.127, 0.127, 0.692, 0.706, A, 14, true));
    addFlame(s * ENGINE_X, ENGINE_Y, 0.88 + ENGINE_Z, 0.1, 0.85);
    // Motorun dışındaki küçük yatay kuyruk kanadı
    const tail = slab(wingShape(TAIL, s < 0), 0.022, H, 0.006); tail.position.y += ENGINE_Y; g.add(tail);
    // Kanat: kök gövde kenarındadır; kanat açıklığı seçimi (shape.wing) grubu x yönünde uzatır.
    const wing = new THREE.Group(); wing.position.set(s * ROOT, -0.005, 0); g.add(wing); wings.push(wing);
    wing.add(slab(wingShape(WING, s < 0), 0.034, H, 0.01));
    const lid = slab(wingShape(WING_PANEL, s < 0), 0.01, D, 0); lid.position.y = 0.024; wing.add(lid);
    // Uçtaki dik kanatçık
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape(WINGLET, false), { depth: 0.026, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 1 }), D);
    fin.rotation.y = -Math.PI / 2; fin.position.set(s * 0.615 + 0.013, 0, 0); fin.rotation.z = 0; wing.add(fin);
    if (!detail) continue;
    // Ön kenar boyunca ışık şeridi, üstte kısa ışık çizgisi, kanatçığın dibinde seyir ışığı
    const [x0, f0] = WING[0], [x1, f1] = WING[1], len = Math.hypot(x1 - x0, f1 - f0), ang = Math.atan2(f1 - f0, x1 - x0);
    const edge = box(len * 0.94, 0.02, 0.02, A, s * (x0 + x1) / 2, 0, -(f0 + f1) / 2 - 0.012); edge.rotation.y = s * ang; wing.add(edge);
    const dash = box(0.2, 0.006, 0.022, A, s * 0.33, 0.031, 0.16); dash.rotation.y = s * ang; wing.add(dash);
    const dash2 = box(0.1, 0.006, 0.018, A, s * 0.47, 0.031, 0.42); wing.add(dash2);
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), A); nav.position.set(s * 0.615, 0, 0.25); wing.add(nav);
  }
  Object.assign(ship.userData, { flames, wings, flameMats, halos, fus });
  return ship;
}

/**
 * Hangardaki görünümü gemiye uygular: gövde, ışık şeridi ve alev rengi; kanat açıklığı ve gövde boyu.
 * Gövde ve şerit malzemeleri ortaktır; hayalet gemi (tek renk) yalnızca biçimi alır.
 */
export function styleShip(ship, look) {
  const u = ship.userData;
  if (u.flameMats.length) { hull.color.set(look.hull.color); accent.color.copy(bright(look.accent.color, 2.2)); }
  for (const m of u.flameMats) m.color.copy(bright(look.flame.color, 1.6));
  for (const h of u.halos) h.material.color.set(look.flame.color);
  for (const w of u.wings) w.scale.x = look.shape.wing;
  // Gövde burna doğru uzar; kuyruk yerinde kalır.
  u.fus.scale.z = look.shape.nose; u.fus.position.z = 0.5 * (1 - look.shape.nose);
}

const pirateHull = new THREE.MeshStandardMaterial({ color: 0x8a1c36, roughness: 0.4, metalness: 0.45, emissive: 0xff2244, emissiveIntensity: 0.3 });
const pirateDark = new THREE.MeshStandardMaterial({ color: 0x1c1226, roughness: 0.55, metalness: 0.5 });
const pirateGold = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.3, metalness: 0.8, emissive: 0xff9a1f, emissiveIntensity: 0.4 });
const pirateEye = new THREE.MeshBasicMaterial({ color: bright(0xff3b5c, 2.8) });
const CLAW = [[0.13, 0.08], [0.6, 0.6], [0.72, 1.0], [0.88, 0.48], [0.62, -0.5], [0.13, -0.44]];

/**
 * Korsan gemisi: öne uzanan iki pençe ve tek kırmızı göz. Burnu -z yönüne bakar.
 * Kaptanınki (Kızıl Kanca) altın süslüdür ve burnunda bir kanca taşır.
 */
export function buildPirate(captain = false) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.5, 6), pirateHull);
  body.rotation.x = -Math.PI / 2; body.scale.set(1, 1, 0.5); g.add(body);
  for (const mir of [false, true]) g.add(slab(wingShape(CLAW, mir), 0.08, pirateDark));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), pirateEye);
  eye.scale.set(0.1, 0.07, 0.17); eye.position.set(0, 0.12, -0.12); g.add(eye);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.28, 0.5), pirateDark);
  fin.rotation.x = 0.35; fin.position.set(0, 0.2, 0.42); g.add(fin);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.8, 12, 1, true), additive(bright(0xff4a2f, 1.7), 0.75));
  jet.rotation.x = Math.PI / 2; jet.position.set(0, 0, 1.1); jet.userData.own = true; g.add(jet);
  if (captain) {
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 1.0), pirateGold);
    spine.position.set(0, 0.17, 0.05); g.add(spine);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 8, 18, Math.PI * 1.25), pirateGold);
    hook.rotation.set(Math.PI / 2, 0, -0.4); hook.position.set(0, -0.02, -0.86); g.add(hook);
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 8), pirateGold);
      tip.rotation.x = -Math.PI / 2; tip.position.set(s * 0.72, 0, -1.08); g.add(tip);
    }
  }
  g.userData.captain = captain;
  return g;
}

const atlasHull = new THREE.MeshStandardMaterial({ color: 0x2c2654, roughness: 0.55, metalness: 0.6 });
const atlasTrim = new THREE.MeshStandardMaterial({ color: 0x7667b8, roughness: 0.4, metalness: 0.7 });

/**
 * Ana Gemi Atlas'ın hangar kapısı: çıkışın hemen ötesinde duran dev gövde. Ön yüzü +z'ye
 * (oyun alanına) bakar; `width` alanın genişliğidir. `userData.lights` kapı ve pencere
 * ışıklarının malzemeleridir: View bunları kısıp açar (gemi yaklaşınca Atlas uyanır).
 */
export function buildAtlasGate(width) {
  const g = new THREE.Group(), lights = [];
  const light = (color, w, h, x, y, z = 0.02) => {
    const mat = new THREE.MeshBasicMaterial({ color });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.userData.own = true; g.add(m);
    lights.push({ mat, base: new THREE.Color(color) });
    return m;
  };
  const W = width + 6, D = 5;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(W, 3.6, D), atlasHull); hull.position.set(0, 0.7, -D / 2); g.add(hull);
  for (const s of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 2.4), atlasHull); tower.position.set(s * (W / 2 - 1.6), 3.3, -D / 2); g.add(tower);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.7, 0.2), atlasTrim); rail.position.set(s * (width * 0.3 + 0.2), 0.7, 0.05); g.add(rail);
    light(0xffd9a0, 0.9, 0.16, s * (W / 2 - 1.6), 3.7); light(0xffd9a0, 0.9, 0.16, s * (W / 2 - 1.6), 3.2);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6 + 0.7, 0.2, 0.2), atlasTrim); lintel.position.set(0, 1.75, 0.05); g.add(lintel);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 2.2, 8), atlasTrim); mast.position.set(0, 3.6, -D / 2); g.add(mast);
  // hangar kapısı: geminin gireceği parlak açıklık
  light(0x9ff3ff, width * 0.6, 1.9, 0, 0.72);
  // pencere sıraları
  for (const s of [-1, 1]) for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    if ((r * 5 + c) % 4 === 3) continue;
    light(c % 3 ? 0xffe2ac : 0x9fe9ff, 0.32, 0.13, s * (width * 0.3 + 0.75 + c * 0.47), 1.9 - r * 0.55);
  }
  g.userData.lights = lights;
  return g;
}

const ROCKS = [0x9a857a, 0x857268, 0xa58e7c, 0x7d6c68];
/** Yontulmuş görünümlü meteor. `rand` 0–1 arası sayı üreten fonksiyondur; `rocks` renk seçenekleridir. */
export function buildMeteor(radius, rand, rocks = ROCKS) {
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const p = geo.attributes.position, v = new THREE.Vector3();
  const a = rand() * 9, b = rand() * 9, c = rand() * 9, d = rand() * 9;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const k = 1 + 0.2 * Math.sin(3.3 * n.x + a) * Math.sin(2.9 * n.y + b) + 0.15 * Math.sin(4.7 * n.z + c)
      + 0.08 * Math.sin(8 * n.x + 6 * n.y + d) + 0.05 * Math.sin(13 * n.z + 9 * n.y + a);
    v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: rocks[Math.floor(rand() * rocks.length)], roughness: 0.95, metalness: 0.05, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.set(rand() * 6, rand() * 6, rand() * 6);
  m.scale.set(1, 0.85 + rand() * 0.2, 0.9 + rand() * 0.25);
  m.userData.spin = new THREE.Vector3((rand() - 0.5) * 0.5, (rand() - 0.5) * 0.7, (rand() - 0.5) * 0.4);
  return m;
}

/** Kristalli kaya: kayanın yüzeyinden camgöbeği kristal uçları çıkar; kırılınca içinden kristal kalır. */
export function addGeodeShards(rock, rand) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8ffcff, emissive: 0x2fd6ff, emissiveIntensity: 1.1, roughness: 0.2, flatShading: true });
  // Kaya döndüğü için uçlar her yöne dağılır; kamera yukarıdan baktığından çoğu üst yarıdadır.
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), mat);
    const dir = new THREE.Vector3(rand() - 0.5, rand() * 0.8 + 0.2, rand() - 0.5).normalize();
    s.position.copy(dir.clone().multiplyScalar(0.48)); s.scale.set(0.8, 1.9, 0.8);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    rock.add(s);
  }
}

/** Demir asteroit: koyu, parlak metal; üstünde perçin gibi küçük çıkıntılar. Lazer onu kıramaz. */
export function makeIron(rock, rand) {
  rock.material = new THREE.MeshStandardMaterial({ color: 0x59616f, roughness: 0.32, metalness: 0.85, flatShading: true });
  const stud = new THREE.MeshStandardMaterial({ color: 0x9aa4b4, roughness: 0.25, metalness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), stud);
    s.position.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(0.42); rock.add(s);
  }
}

// Kristalin kendi ışığı azdır: yüzleri sahne ışığını ayrı ayrı yakalar, taş bir ışık topuna dönüşmez.
const crystalMat = new THREE.MeshStandardMaterial({ color: 0x4fd8ff, roughness: 0.16, metalness: 0.2, emissive: 0x1479c8, emissiveIntensity: 0.6, flatShading: true });
/** Kristal: altı yüzlü kesme taş; üstte kısa taç, altta uzun sivri uç. */
export function buildCrystal() {
  const g = new THREE.Group(), gem = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.26, 6), crystalMat); crown.position.y = 0.2;
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.5, 6), crystalMat); point.rotation.x = Math.PI; point.position.y = -0.18;
  gem.add(crown, point); g.add(gem);
  g.userData.gem = gem;
  return g;
}

function boltShape() {
  const s = new THREE.Shape(), pts = [[0.06, 0.32], [-0.17, -0.04], [-0.02, -0.04], [-0.08, -0.32], [0.17, 0.05], [0.02, 0.05]];
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
}

/**
 * Yol işaretleri. İkisi de zeminde bir halkadır; üstlerinde ne olduklarını söyleyen bir simge döner:
 *   'beacon'  mor halka: dışa doğru yayılan sinyal halkası ve bir yön kristali
 *   'energy'  yeşil şarj istasyonu: hafif ışıklı bir zemin ve bir şimşek
 * `userData.core` dönen simge, `userData.pulse` (yalnız işarette) yayılan halkadır.
 */
export function buildMarker(kind) {
  const beacon = kind === 'beacon', color = beacon ? 0xb786ff : 0x4cffa4, g = new THREE.Group();
  const own = (m) => { m.userData.own = true; g.add(m); return m; };
  const ring = own(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 8, 36), additive(bright(color, 1.5), 0.9)));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.08;
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.32, flatShading: true });
  let core, pulse = null;
  if (beacon) {
    pulse = own(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.57, 36), additive(bright(color, 1.2), 0.5)));
    pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.04;
    core = own(new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), mat)); core.scale.set(0.8, 1.3, 0.8);
  } else {
    const pad = own(new THREE.Mesh(new THREE.CircleGeometry(0.47, 28), additive(color, 0.13)));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.03;
    const geo = new THREE.ExtrudeGeometry(boltShape(), { depth: 0.08, bevelEnabled: false }); geo.center();
    core = own(new THREE.Mesh(geo, mat));
  }
  core.position.y = 0.46;
  g.userData = { core, pulse };
  return g;
}

/** Yumuşak yuvarlak parıltı dokusu (parçacıklar ve haleler için). */
export function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

/** Sensör taramasının ışını: gemiden bakılan kareye doğru daralan şerit. */
export function beamTexture() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0.05)');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(64, 0); c.lineTo(42, 256); c.lineTo(22, 256); c.closePath(); c.fill();
  return new THREE.CanvasTexture(cv);
}

/**
 * Uzay arka planı: gökyüzü, bulutsu, yıldızlar ve sektöre özgü öğeler.
 * Görünüm `theme` ile belirlenir (bkz. themes.js). `rect` uçuş alanının ekrandaki bölgesidir:
 * gezegen ve Atlas ona göre boyutlanır ve yerleşir (verilmezse bütün ekran). `docked`: Atlas'ın
 * kapısı sahnede duruyorsa arka plandaki Atlas çizilmez.
 */
export function paintBackground(W, H, rand, theme, progress = 0, rect = null, docked = false) {
  const area = rect || { x: 0, y: 0, w: W, h: H };
  const S = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(W * S)); cv.height = Math.max(2, Math.round(H * S));
  const c = cv.getContext('2d'); c.scale(S, S);
  const g = c.createLinearGradient(0, 0, W * 0.7, H);
  g.addColorStop(0, theme.sky[0]); g.addColorStop(0.5, theme.sky[1]); g.addColorStop(1, theme.sky[2]);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const blob = (x, y, r, rgb, a) => {
    const q = c.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, `rgba(${rgb},${a})`); q.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = q; c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const u = Math.max(W, H) / 1440, n4 = theme.nebula;
  blob(W * 0.39, H * 0.42, 560 * u, n4[0], 0.3); blob(W * 0.6, H * 0.85, 380 * u, n4[1], 0.17);
  blob(W * 0.12, H * 0.22, 380 * u, n4[2], 0.17); blob(W * 0.36, H * 0.07, 300 * u, n4[3], 0.15);
  const n = Math.round(620 * (W * H) / (1440 * 900));
  for (let i = 0; i < n; i++) {
    const x = rand() * W, y = rand() * H, r = 0.35 + Math.pow(rand(), 3.2) * 1.7, a = 0.25 + rand() * 0.75, t = rand();
    c.fillStyle = t < 0.7 ? `rgba(255,255,255,${a})` : t < 0.87 ? `rgba(160,205,255,${a})` : `rgba(255,214,170,${a})`;
    c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  }
  for (const [fx, fy, s] of [[0.63, 0.28, 1], [0.08, 0.17, 0.8], [0.65, 0.68, 0.7], [0.21, 0.95, 0.6]]) {
    const x = fx * W, y = fy * H;
    blob(x, y, 26 * s, '190,220,255', 0.55);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.2 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 13 * s, y); c.lineTo(x + 13 * s, y); c.moveTo(x, y - 13 * s); c.lineTo(x, y + 13 * s); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 2.2 * s, 0, 6.283); c.fill();
  }
  if (EXTRAS[theme.extra] && !(docked && theme.extra === 'station')) EXTRAS[theme.extra](c, W, H, rand, u, blob, progress, area);
  if (theme.planet) paintPlanet(c, area, theme.planet, progress);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Uçuş alanının sol kenarından görünen gezegen. Sektörde ilerledikçe (`progress` 0–1) yaklaşır:
 * büyür ve içeri kayar. Boyu alanın bölgesine (`area`) göredir; dar ekranda görünen kısmı sınırlanır,
 * böylece ızgaranın üstüne binmez.
 */
function paintPlanet(c, area, { hue, ring }, progress) {
  // Dar bölgede (dik telefon) ızgara neredeyse bütün genişliği kaplar: gezegen küçülür ve ızgaranın
  // daraldığı üst köşeye çekilir; halkalı gezegen daha da az içeri girer.
  const narrow = area.w < 560, base = Math.min(area.h, area.w * 0.9), R = base * (narrow ? 0.2 + 0.07 * progress : 0.22 + 0.11 * progress);
  const peek = Math.min(R * (0.54 + 0.2 * progress), area.w * (narrow ? (ring ? 0.11 : 0.16) : 0.2));
  const px = area.x + peek - R, py = area.y + area.h * (narrow ? 0.36 : 0.52), hsl = (dh, s, l, a = 1) => `hsla(${hue + dh},${s}%,${l}%,${a})`;
  const glow = R * 0.42;
  const halo = c.createRadialGradient(px, py, R * 0.8, px, py, R + glow);
  halo.addColorStop(0, hsl(0, 90, 65, 0.34)); halo.addColorStop(1, hsl(0, 90, 65, 0));
  c.fillStyle = halo; c.fillRect(px - R - glow, py - R - glow, (R + glow) * 2, (R + glow) * 2);
  const arc = (front) => {
    c.save(); c.translate(px, py); c.rotate(-0.3); c.scale(1, 0.26);
    c.strokeStyle = hsl(10, 85, 80, front ? 0.6 : 0.28); c.lineWidth = R * 0.11;
    c.beginPath(); c.arc(0, 0, R * 1.55, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); c.stroke();
    c.strokeStyle = hsl(-10, 80, 70, front ? 0.4 : 0.18); c.lineWidth = R * 0.05;
    c.beginPath(); c.arc(0, 0, R * 1.82, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); c.stroke();
    c.restore();
  };
  if (ring) arc(false);
  c.save(); c.beginPath(); c.arc(px, py, R, 0, 6.283); c.clip();
  const pg = c.createRadialGradient(px + R * 0.55, py - R * 0.5, R * 0.05, px + R * 0.1, py, R * 1.25);
  pg.addColorStop(0, hsl(-8, 95, 84)); pg.addColorStop(0.3, hsl(0, 78, 54)); pg.addColorStop(0.62, hsl(18, 72, 36)); pg.addColorStop(1, hsl(40, 70, 14));
  c.fillStyle = pg; c.fillRect(px - R, py - R, R * 2, R * 2);
  c.globalAlpha = 0.16; c.strokeStyle = '#fff';
  for (const [dy, w] of [[-0.56, 16], [-0.29, 30], [0.02, 12], [0.27, 26], [0.55, 14]]) {
    c.lineWidth = w * R / 215; c.beginPath(); c.ellipse(px, py + dy * R, R * 1.15, R * 0.12, -0.16, 0, 6.283); c.stroke();
  }
  c.globalAlpha = 1;
  const sh = c.createRadialGradient(px + R * 0.6, py - R * 0.55, R * 0.5, px + R * 0.3, py - R * 0.2, R * 1.5);
  sh.addColorStop(0, 'rgba(4,8,30,0)'); sh.addColorStop(1, 'rgba(4,8,30,0.82)');
  c.fillStyle = sh; c.fillRect(px - R, py - R, R * 2, R * 2);
  c.restore();
  c.strokeStyle = hsl(0, 90, 82, 0.55); c.lineWidth = 2; c.beginPath(); c.arc(px, py, R, -1.25, 0.55); c.stroke();
  if (ring) arc(true);
}

/** Sektöre özgü arka plan öğeleri. Hepsi geri planda, soluk çizilir; oyun alanını bastırmaz. */
const EXTRAS = {
  // Asteroit kuşağı: ekranı çaprazlama geçen kaya şeridi
  belt(c, W, H, rand, u) {
    for (let i = 0; i < 150; i++) {
      const t = rand(), off = (rand() - 0.5) * 2, x = t * W * 1.1 - W * 0.05, y = H * (0.92 - t * 0.78) + off * off * Math.sign(off) * H * 0.13;
      const r = (1.5 + Math.pow(rand(), 2.4) * 11) * u, a = 0.3 + rand() * 0.45;
      c.save(); c.translate(x, y); c.rotate(rand() * 3); c.scale(1, 0.62 + rand() * 0.3);
      c.fillStyle = `rgba(${95 + rand() * 50},${66 + rand() * 30},${48 + rand() * 20},${a})`;
      c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill();
      c.fillStyle = `rgba(255,205,150,${a * 0.38})`; c.beginPath(); c.arc(-r * 0.25, -r * 0.3, r * 0.52, 0, 6.283); c.fill();
      c.restore();
    }
  },
  // Meteor yağmuru: gökten süzülen ışık çizgileri
  streaks(c, W, H, rand, u) {
    c.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = rand() * W * 1.2, y = rand() * H, len = (50 + rand() * 190) * u, a = 0.12 + rand() * 0.34;
      const q = c.createLinearGradient(x, y, x - len * 0.55, y + len);
      q.addColorStop(0, 'rgba(255,190,170,0)'); q.addColorStop(1, `rgba(255,${150 + rand() * 80},${130 + rand() * 60},${a})`);
      c.strokeStyle = q; c.lineWidth = (0.8 + rand() * 2.2) * u;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - len * 0.55, y + len); c.stroke();
      c.fillStyle = `rgba(255,235,215,${a + 0.2})`; c.beginPath(); c.arc(x - len * 0.55, y + len, (1 + rand() * 1.6) * u, 0, 6.283); c.fill();
    }
  },
  // Karanlık bulutsu: yıldızları örten koyu bulutlar
  clouds(c, W, H, rand, u, blob) {
    for (let i = 0; i < 16; i++) blob(rand() * W, rand() * H, (150 + rand() * 260) * u, '4,3,16', 0.5 + rand() * 0.34);
    for (let i = 0; i < 5; i++) blob(rand() * W, rand() * H, (90 + rand() * 150) * u, '120,80,255', 0.09);
  },
  // Korsan bölgesi: savrulan kor parçaları ve enkaz
  embers(c, W, H, rand, u, blob) {
    for (let i = 0; i < 70; i++) {
      const x = rand() * W, y = rand() * H, r = (0.8 + Math.pow(rand(), 2) * 2.6) * u;
      blob(x, y, r * 7, '255,90,50', 0.2); c.fillStyle = `rgba(255,${150 + rand() * 80},90,${0.5 + rand() * 0.4})`;
      c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
    }
    for (let i = 0; i < 16; i++) {
      c.save(); c.translate(rand() * W, rand() * H); c.rotate(rand() * 6.283);
      const s = (7 + rand() * 20) * u; c.fillStyle = `rgba(42,22,28,${0.6 + rand() * 0.3})`; c.strokeStyle = 'rgba(255,120,90,0.3)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-s, -s * 0.3); c.lineTo(s * 0.6, -s * 0.5); c.lineTo(s, s * 0.2); c.lineTo(-s * 0.2, s * 0.5); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  },
  // Enerji krizi: kutup ışığına benzeyen enerji şeritleri
  aurora(c, W, H, rand, u) {
    c.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const y0 = H * (0.12 + k * 0.22 + rand() * 0.08), amp = H * (0.04 + rand() * 0.06), ph = rand() * 6, w = (26 + rand() * 46) * u;
      const q = c.createLinearGradient(0, y0 - amp, W, y0 + amp);
      q.addColorStop(0, 'rgba(60,255,170,0)'); q.addColorStop(0.3 + rand() * 0.2, `rgba(${60 + rand() * 60},255,${170 + rand() * 60},0.2)`); q.addColorStop(1, 'rgba(40,200,255,0)');
      c.strokeStyle = q; c.lineWidth = w; c.beginPath();
      for (let x = -20; x <= W + 20; x += 24) { const y = y0 + Math.sin(x / W * 5.2 + ph) * amp + Math.sin(x / W * 13 + ph * 2) * amp * 0.3; if (x < 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke();
    }
  },
  // Manevra okulu: uzakta dizili eğitim halkaları
  rings(c, W, H, rand, u) {
    for (let i = 0; i < 9; i++) {
      const x = W * (0.08 + rand() * 0.84), y = H * (0.06 + rand() * 0.88), r = (16 + rand() * 54) * u, a = 0.12 + rand() * 0.2;
      c.save(); c.translate(x, y); c.rotate(rand() * 1.2 - 0.6); c.scale(1, 0.34 + rand() * 0.4);
      c.strokeStyle = `rgba(255,${200 + rand() * 40},110,${a})`; c.lineWidth = (2 + rand() * 3) * u; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.stroke();
      c.strokeStyle = `rgba(255,240,190,${a * 0.6})`; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r * 1.25, 0, 6.283); c.stroke();
      c.restore();
    }
  },
  // Ana gemi: sol kenarda dev bir geminin gövdesi
  station(c, W, H, rand, u, blob, progress, area) {
    // Atlas her görevde biraz daha yakın görünür. Boyu uçuş alanının bölgesine göredir; burnu
    // bölgenin beşte birini geçmez (dar ekranda ızgaranın üstüne taşmasın).
    const base = Math.min(area.h, area.w * 0.9), s = base * (0.21 + 0.13 * progress);
    const x = Math.min(area.x + base * 0.02 - s * (0.3 - 0.3 * progress), area.x + area.w * 0.22 - s * 1.02), y = area.y + area.h * 0.5;
    blob(x, y, s * 1.5, '210,90,255', 0.24);
    c.save(); c.translate(x, y); c.rotate(-0.24);
    const body = c.createLinearGradient(-s * 0.5, 0, s * 0.62, 0);
    body.addColorStop(0, '#0d0a1e'); body.addColorStop(0.65, '#2b2350'); body.addColorStop(0.9, '#6a5aa8'); body.addColorStop(1, '#cdb8ff');
    c.fillStyle = body;
    c.beginPath(); c.moveTo(-s * 0.5, -s * 1.5); c.lineTo(s * 0.3, -s * 1.28); c.lineTo(s * 0.62, -s * 0.4); c.lineTo(s * 0.62, s * 0.5); c.lineTo(s * 0.28, s * 1.32); c.lineTo(-s * 0.5, s * 1.55); c.closePath(); c.fill();
    c.fillStyle = '#1a1536';
    c.beginPath(); c.moveTo(s * 0.62, -s * 0.16); c.lineTo(s * 1.02, -s * 0.07); c.lineTo(s * 1.02, s * 0.2); c.lineTo(s * 0.62, s * 0.3); c.closePath(); c.fill();
    blob(s * 1.05, s * 0.06, s * 0.3, '120,230,255', 0.55);
    c.fillStyle = 'rgba(160,240,255,0.95)'; c.fillRect(s * 1.0, -s * 0.04, s * 0.03, s * 0.2);
    for (let r = 0; r < 15; r++) for (let k = 0; k < 6; k++) {
      if (rand() < 0.36) continue;
      const wx = -s * 0.36 + k * s * 0.15, wy = -s * 1.12 + r * s * 0.16;
      c.fillStyle = rand() < 0.2 ? 'rgba(120,235,255,0.9)' : `rgba(255,${205 + rand() * 40},150,${0.45 + rand() * 0.5})`;
      c.fillRect(wx, wy, s * 0.07, s * 0.035);
    }
    c.strokeStyle = 'rgba(210,180,255,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(s * 0.3, -s * 1.28); c.lineTo(s * 0.62, -s * 0.4); c.lineTo(s * 0.62, s * 0.5); c.lineTo(s * 0.28, s * 1.32); c.stroke();
    c.restore();
    c.save(); c.translate(x + s * 0.2, y); c.rotate(-0.24); c.scale(1, 0.2);
    c.strokeStyle = 'rgba(240,170,255,0.5)'; c.lineWidth = s * 0.07; c.beginPath(); c.arc(0, 0, s * 1.5, -0.2, Math.PI + 0.2); c.stroke();
    c.restore();
  },
};
