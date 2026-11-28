// Canavar Okulu: on bir kısa ders. Her ders tek bir fikir öğretir ve atölyeye bir şey açar.
//
// Bir dersin alanları: waves (denemeler; aynı program hepsinde tutmalı), parts (programlanan parçalar),
// goal (motor.js → judge), solution (testler için örnek çözüm), hints.
//   parts[i].start : çocuğun önüne gelen program (kısa yazım)
//   parts[i].tools : o derste palette duran bloklar, koşullar, olaylar
//   parts[i].cap   : programın alabileceği en çok blok ("çantan 4 blok alıyor")
// Yıldız ve puan yok. Ders geçilince sıradaki açılır; ödül atölyeye gelen yeni blok ya da parçadır.
import { buildLevel, simulate } from './motor.js';

const monster = (x, y, dir) => ({ kind: 'monster', x, y, dir });

export const LESSONS = [
  {
    id: 1, title: 'İlk Adım', type: 'yaz', coach: true,
    text: 'Canavarı bayrağa götür.',
    waves: [{ rows: ['#####', '...F#', '#####'], ents: [monster(0, 1, 1)] }],
    parts: [{ start: 'f', tools: { blocks: ['fwd'] } }],
    goal: { type: 'flags' }, solution: ['fff'],
    hints: ['Her «ileri git» canavarı bir kare yürütür.', 'Bayrak üç kare ötede: üç «ileri git» gerek.'],
  },
  {
    id: 2, title: 'Köşe', type: 'yaz',
    text: 'Köşeyi dön, bayrağa var.',
    waves: [{ rows: ['#####', '#..F#', '#.###', '#.###'], ents: [monster(1, 3, 0)] }],
    parts: [{ start: '', tools: { blocks: ['fwd', 'left', 'right'] } }],
    goal: { type: 'flags' }, solution: ['ffrff'],
    hints: ['«sağa dön» canavarı yürütmez; yalnızca baktığı yönü çevirir.', 'İki ileri, sağa dön, iki ileri.'],
  },
  {
    id: 3, title: 'Yanlış Dönüş', type: 'duzelt',
    text: 'Bu program bir yerde yanlış dönüyor. Bul, düzelt.',
    waves: [{ rows: ['F..##', '##.##', '##..#'], ents: [monster(3, 2, 3)] }],
    parts: [{ start: 'frffrff', tools: { blocks: ['fwd', 'left', 'right'] } }],
    goal: { type: 'flags' }, solution: ['frfflff'],
    hints: ['Önce çalıştır ve canavarın nerede tosladığına bak.', 'Yanlış bloğa dokun, sil; yerine doğrusunu koy.'],
  },
  {
    id: 4, title: 'Uzun Koridor', type: 'yaz',
    text: 'Çantan yalnız 2 blok alıyor. «tekrarla» ile bayrağa var.',
    waves: [{ rows: ['#######', '......F', '#######'], ents: [monster(0, 1, 1)] }],
    parts: [{ start: '', cap: 2, tools: { blocks: ['fwd', 'repeat'] } }],
    goal: { type: 'flags' }, solution: ['R6(f)'],
    hints: ['«tekrarla» içine konan bloğu yazdığın sayı kadar yapar.', 'Sayıya dokun ve 6 yap; içine bir «ileri git» koy.'],
  },
  {
    id: 5, title: 'Kare Tur', type: 'yaz',
    text: 'Dört bayrağa da dokun. Çantan 4 blok alıyor.',
    waves: [{ rows: ['.F.', 'F#F', '.F.'], ents: [monster(0, 2, 0)] }],
    parts: [{ start: '', cap: 4, tools: { blocks: ['fwd', 'left', 'right', 'repeat'] } }],
    goal: { type: 'flags' }, solution: ['R4(ffr)'],
    hints: ['Her kenarda aynı şeyi yapıyorsun: iki ileri, bir dönüş.', 'Bu üç bloğu «4 kez tekrarla» içine koy.'],
  },
  {
    id: 6, title: 'Nöbet', type: 'yaz',
    text: 'Nöbetçi hiç durmaz: iki bayrağa da ikişer kez dokun.',
    waves: [{ rows: ['#####', '#F.F#', '#####'], ents: [monster(1, 1, 1)] }],
    parts: [{ start: '', cap: 5, tools: { blocks: ['fwd', 'left', 'right', 'forever'] } }],
    goal: { type: 'flags', times: 2 }, solution: ['F(ffrr)'],
    hints: ['«sürekli tekrarla» içindekileri hiç bırakmadan baştan yapar.', 'Geri dönmek için iki kez aynı yöne dön.'],
  },
  {
    id: 7, title: 'Tahmin Et', type: 'tahmin',
    text: 'Programı oku: canavar hangi karede duracak? O kareye dokun.',
    // İki başlangıç: tahmin tutmazsa canavar ötekinden başlar, böylece görülen cevap ezberlenmez.
    waves: [
      { rows: ['.....', '.....', '.....'], ents: [monster(0, 2, 1)] },
      { rows: ['.....', '.....', '.....'], ents: [monster(4, 0, 3)] },
    ],
    parts: [{ start: 'R2(flfr)f', lock: true, tools: { blocks: [] } }],
    goal: { type: 'predict' }, solution: ['R2(flfr)f'],
    hints: ['Parmağınla canavarı adım adım yürüt; dönüşlerde yalnız yönü değişir.', 'Döngü iki kez dönüyor; ondan sonra bir «ileri git» daha var.'],
  },
  {
    id: 8, title: 'Duvara Kadar', type: 'yaz',
    text: 'Koridor her denemede değişiyor. Önü kapalıysa dönsün, açıksa yürüsün.',
    waves: [
      { rows: ['....#', '###.#', '#F..#', '#####'], ents: [monster(0, 0, 1)] },
      { rows: ['..###', '#.###', '#.###', 'F.###'], ents: [monster(0, 0, 1)] },
    ],
    parts: [{ start: 'F(Iw()())', tools: { blocks: ['fwd', 'left', 'right', 'forever', 'if'], conds: ['wall'] } }],
    goal: { type: 'flags' }, solution: ['F(Iw(r)(f))'],
    hints: ['«eğer» sorar: önüm kapalı mı? Evetse üstteki, hayırsa «değilse» altındaki çalışır.', 'Önü kapalıysa «sağa dön», değilse «ileri git».'],
  },
  {
    id: 9, title: 'Gözcü', type: 'yaz',
    text: 'Hırsız şövalye her denemede başka koridordan geliyor. Gözcün dönerek baksın, görünce koşsun.',
    waves: [
      { rows: ['###.###', '###.###', '.....aS', '###.###', '###.###'], ents: [monster(3, 2, 0)], path: 'L....R' },
      { rows: ['###.###', '###.###', 'Sa.....', '###.###', '###.###'], ents: [monster(3, 2, 0)], path: 'R....L' },
      { rows: ['###.###', '###.###', '.......', '###a###', '###S###'], ents: [monster(3, 2, 0)], path: 'U....D' },
    ],
    parts: [{ start: '', tools: { blocks: ['fwd', 'dash', 'left', 'right', 'forever', 'if'], conds: ['see', 'wall'] } }],
    goal: { type: 'catch' }, solution: ['F(Ie(d)(r))'],
    hints: ['Geçen dersteki kalıbı kur: «sürekli tekrarla», içine «eğer / değilse».', 'Şövalyeyi görüyorsa koşsun; görmüyorsa bir yana dönüp oraya baksın.'],
  },
  {
    id: 10, title: 'Tuzak Kapı', type: 'yaz',
    text: 'Bu kez kapıyı programla: şövalye altını alınca kapansın, içeride kalsın.',
    waves: [
      { rows: ['#######', 'S....a#', '#######'], ents: [{ kind: 'door', x: 3, y: 1, on: true }], path: 'RRRRRLLLLL' },
      { rows: ['#######', 'S....a#', '#######'], ents: [{ kind: 'door', x: 3, y: 1, on: true }], path: 'RR....RRRLLLLL' },
    ],
    parts: [{ start: '', tools: { blocks: ['open', 'close', 'wait', 'on'], events: ['start', 'coin'] } }],
    goal: { type: 'trap', zone: { x0: 4, y0: 1, x1: 5, y1: 1 } }, solution: ['@s()@c(c)'],
    hints: ['Şövalye her denemede başka zamanda geliyor: saymak işe yaramaz.', '«olunca» bloğu ekle, olayını «altın alınınca» yap, içine «kapan» koy.'],
  },
  {
    id: 11, title: 'Alarm', type: 'yaz',
    text: 'Kapı göremez, gözcü görür. Gözcü alarm çalsın; kapı alarmı duyunca kapansın.',
    waves: [
      { rows: ['#######', 'S.....#', '####.##', '####.##'], ents: [{ kind: 'monster', x: 4, y: 3, dir: 0 }, { kind: 'door', x: 3, y: 1, on: true }], path: 'RRRRRLLLLL' },
      { rows: ['#######', 'S.....#', '####.##', '####.##'], ents: [{ kind: 'monster', x: 4, y: 3, dir: 0 }, { kind: 'door', x: 3, y: 1, on: true }], path: 'R.R.R.RRR.LLLLL' },
    ],
    parts: [
      { name: 'Gözcü', start: '', tools: { blocks: ['alarm', 'roar', 'on'], events: ['start', 'see'] } },
      { name: 'Kapı', start: '', tools: { blocks: ['open', 'close', 'on'], events: ['start', 'alarm'] } },
    ],
    goal: { type: 'trap', zone: { x0: 4, y0: 1, x1: 5, y1: 1 } }, solution: ['@s()@e(a)', '@s()@a(c)'],
    hints: ['İki ayrı program yazacaksın: üstteki düğmelerle gözcü ile kapı arasında geç.', 'Gözcü: «şövalyeyi görünce» → «alarm çal». Kapı: «alarm çalınca» → «kapan».'],
  },
];

export const lessonById = (id) => LESSONS.find((l) => l.id === Number(id)) || null;

/** Dersin bir denemesini, verilen programlarla oynanabilir kaleye çevirir. */
export function waveLevel(lesson, w, progs) {
  const wave = lesson.waves[w];
  return buildLevel({ rows: wave.rows, path: wave.path, ents: wave.ents.map((e, i) => ({ ...e, name: lesson.parts[i].name, prog: progs[i] })) });
}

/**
 * Programları bütün denemelerde çalıştırır. Dönen: { ok, wave, why, left, runs }.
 * `runs[i]` o denemenin kare kare kaydıdır; ilk tutmayan denemede durulur.
 */
export function runLesson(lesson, progs) {
  const runs = [];
  for (let w = 0; w < lesson.waves.length; w++) {
    const level = waveLevel(lesson, w, progs), res = simulate(level, lesson.goal);
    runs.push({ level, ...res });
    if (!res.ok) return { ok: false, wave: w, why: res.why, left: res.left, runs };
  }
  return { ok: true, wave: lesson.waves.length - 1, runs };
}

/** Olmayınca söylenen tek cümle. */
export function failText(lesson, res) {
  const nth = lesson.waves.length > 1 ? `${res.wave + 1}. denemede ` : '';
  const say = (subject, rest) => `${nth ? nth + subject : subject[0].toLocaleUpperCase('tr') + subject.slice(1)} ${rest}`;
  switch (res.why) {
    case 'empty': return 'Program boş: önce birkaç blok ekle.';
    case 'bump': return `Güm! ${say('canavar', 'tosladı ve bayrağa varamadı.')}`;
    case 'short': return say('canavar', res.left > 1 ? `durdu ama ${res.left} bayrak kaldı.` : 'bayrağa varmadan durdu.');
    case 'time': return say('süre', 'doldu: canavar bayraklara yetişemedi.');
    case 'escaped': return say('şövalye', 'kaçtı!');
    case 'early': return say('kapı', 'erken kapandı: şövalye içeri giremedi.');
    case 'open': return say('kapı', 'açık kaldı: şövalye kaçtı.');
    default: return 'Olmadı. Bir daha dene.';
  }
}
