// Kayıt: geçilen dersler, yarım kalan programlar ve kurulan kaleler tarayıcıda saklanır.
// Hiçbir yere gönderilmez.
import { checkCastle } from './kaleler.js';

const KEY = 'kale.v1';
const blank = () => ({ done: [], drafts: {}, castles: [], next: 1, sound: true, master: false });

export function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (err) { /* kayıt yok ya da okunamıyor: baştan başla */ }
  const data = { ...blank(), ...(raw && typeof raw === 'object' ? raw : {}) };
  data.done = Array.isArray(data.done) ? data.done.filter((n) => Number.isInteger(n)) : [];
  data.drafts = data.drafts && typeof data.drafts === 'object' ? data.drafts : {};
  // Bozulmuş bir kale bütün kaydı götürmesin: okunamayan atlanır.
  data.castles = (Array.isArray(data.castles) ? data.castles : []).flatMap((c) => {
    try { return [{ ...checkCastle(c), id: String(c.id), proven: !!c.proven, shared: !!c.shared }]; } catch (err) { return []; }
  });
  return data;
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (err) { return false; }
}
