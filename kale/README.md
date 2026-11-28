# Canavar Kalesi

Çocuklar için blok kodlama oyunu (9 yaş ve çevresi). Kod Pilotu'ndan bağımsız, sıfırdan tasarlandı;
aynı depoda `kale/` klasöründe durur ve onun hiçbir dosyasını kullanmaz.

Fikir: çocuk bulmaca çözmekle kalmaz, **kendi oyununu kurar**. Bir kale çizer; içine koyduğu her
canavara, kapıya ve dikene program yazar. Sonra telefonu babasına verir (ya da bağlantı gönderir):
baba şövalyeyle hazineye ulaşmaya çalışır. Kaleyi yenmenin yolu, çocuğun yazdığı programı okumaktır.

Yayındaki adres: `https://isinanyavuz-cmd.github.io/codepilot/kale/`

## Nasıl oynanır

Oyun **tur tur** ilerler: önce şövalye bir hamle yapar, sonra kaledeki programlı her şey programından
**tek bir hareket** yapar. Refleks gerekmez; düşünmek ve zamanlamak gerekir.

- **Canavar Okulu**: on bir kısa ders. Her ders tek bir fikir öğretir ve atölyeye yeni bir blok ya da
  parça açar. Yıldız ve puan yoktur; ödül, atölyede kullanılacak yeni şeydir.
- **Atölye** (3. dersten sonra açılır): kareleri doldur, parçalara program yaz, «Oyna» ile kendin
  bitir. Kendi bitirdiğin kale **kanıtlanmış** olur ve paylaşılabilir; böylece çözülemeyen kale
  gönderilemez. Örnek kaleler önce oynanır, sonra kopyalanıp değiştirilir.
- **Usta işi**: atölyenin uzun soluklu hedefi (döngülü bir canavar, olaya bağlı bir parça, bitirilmiş
  ve birine oynatılmış bir kale). Bulmaca çözerek değil, kale kurarak tamamlanır.

| Ders | Fikir | Atölyeye açtığı |
|---|---|---|
| 1 İlk Adım | bloklar sırayla çalışır | |
| 2 Köşe | dönmek yürümek değildir | |
| 3 Yanlış Dönüş | hata bulup düzeltmek | atölye, canavar, duvar |
| 4 Uzun Koridor | tekrarla | tekrarla |
| 5 Kare Tur | döngünün içinde birden çok blok | altın |
| 6 Nöbet | sürekli tekrarla | sürekli tekrarla, diken |
| 7 Tahmin Et | programı okuyup sonucu kestirmek | kapı |
| 8 Duvara Kadar | eğer / değilse, "önüm kapalıysa" | eğer / değilse |
| 9 Gözcü | "şövalyeyi görüyorsam" | koş, görüş |
| 10 Tuzak Kapı | olaylar: "altın alınınca" | olunca, anahtar, düğme |
| 11 Alarm | parçalar birbirine haber verir | alarm çal / alarm çalınca |

Çok denemeli derslerde (8–11) aynı program her denemede tutmalıdır: şövalye her seferinde başka
yoldan ya da başka zamanda gelir. Yolu ezberleyen ya da turları sayan program öteki denemede kalır.

### Bloklar

- **Canavar**: ileri git, sola dön, sağa dön, koş (bir turda iki kare), bekle, kükre, alarm çal.
- **Kapı**: açıl, kapan, bekle. **Diken**: dikenleri çıkar, dikenleri indir, bekle.
- **Hepsi**: tekrarla, sürekli tekrarla, «olunca» (oyun başlayınca, altın alınınca, anahtar alınınca,
  düğmeye basılınca, alarm çalınca; canavarda ayrıca şövalyeyi görünce).
- **Yalnız canavar**: eğer / değilse (önüm kapalıysa, şövalyeyi görüyorsam).

Kapının anahtarla açılması gibi kurallar oyuna gömülü değildir: çocuk yazar ("anahtar alınınca: açıl").

### Telefonda

Blok editörü sürüklemesiz çalışır: paletteki bloğa dokununca sarı çizginin olduğu yere eklenir;
programdaki bloğa dokununca seçilir ve ↑ ↓ ile taşınır (döngünün içine girer, sonundan çıkar) ya da
silinir. Dikeyde tahta üstte, program altta; yatayda ve geniş ekranda yan yana durur.

## Çalıştırmak

Derleme adımı yok. Depo kökünde `npm start`, sonra `http://localhost:8080/kale/`.

- `?hepsi`: bütün dersler ve parçalar açık gelir (gözden geçirmek için; kayda yazılmaz).
  Örnek: `http://localhost:8080/kale/?hepsi#ders/9`
- Adresler: `#okul`, `#ders/4`, `#atolye`, `#kur/k1`, `#oyna/k1`, `#ornek/0`, `#k=…` (paylaşılan kale).
- Kayıt yalnız o cihazın tarayıcısında durur (`kale.v1`); hiçbir yere gönderilmez. Paylaşılan
  bağlantı kalenin kendisini taşır, sunucu yoktur.

## Geliştirme

Testler depo kökündeki `npm test` ile çalışır (`tests/kale.test.js`).

| Dosya | Görev |
|---|---|
| `src/motor.js` | Kurallar ve program yürütücü. Saf mantık; her tur yeni durumu ve olay listesini verir |
| `src/bloklar.js` | Blok kataloğu, program ağacı, kısa yazım (`'F(ffrr)'`), derslerle açılanlar |
| `src/dersler.js` | On bir ders, ders çalıştırıcı, olmayınca söylenen cümleler |
| `src/kaleler.js` | Atölye kaleleri: kareye parça koyma, denetleme, bağlantıya çevirme, örnekler |
| `src/tahta.js`, `src/cizim.js` | Tahtanın çizimi (DOM ve elle yazılmış SVG) |
| `src/editor.js` | Blok editörü |
| `src/ders.js`, `src/atolye.js`, `src/oyna.js` | Ders, atölye ve oynama ekranları |
| `src/uygulama.js` | Giriş, ana ekran, ekranlar arası gezinme |
| `src/kayit.js`, `src/ses.js`, `src/arayuz.js` | Kayıt, ses efektleri, küçük arayüz yardımcıları |
| `sw.js` | Çevrimdışı çalışma: her dosya önce ağdan istenir, ağ yoksa son hali açılır |

Testlerin denetledikleri, kural olarak:

- Her dersin örnek çözümü bütün denemelerde tutar; hazır gelen program işi çocuğa bırakır.
- Dersin öğrettiği fikir o derste gerçekten gereklidir: çanta sınırı olan dersler döngüsüz, 8. ders
  sensörsüz, 9. ders görmeden geçilemez; 10 ve 11. derslerde hangi turda kapanırsa kapansın turları
  sayan kapı bir denemede kalır.
- Bağlantıdan gelen kale güvenilmeyen girdidir: boyut, kareler, parça türleri ve programlar
  denetlenir; kale adı ekrana yalnız düz metin olarak yazılır.
- Örnek kaleler çözülebilir (`solve()` en kısa hamle dizisini arar) ama beklemeden yürüyen yakalanır.

### Yeni ders eklemek

`src/dersler.js` içindeki `LESSONS` listesine eklenir. Alan metinle çizilir (`.` zemin, `#` duvar,
`S` şövalye, `H` hazine, `a` altın, `k` anahtar, `d` düğme, `F` bayrak); programlar kısa yazımla verilir:

```js
{
  id: 4, title: 'Uzun Koridor', type: 'yaz',
  text: 'Çantan yalnız 2 blok alıyor. «tekrarla» ile bayrağa var.',
  waves: [{ rows: ['#######', '......F', '#######'], ents: [{ kind: 'monster', x: 0, y: 1, dir: 1 }] }],
  parts: [{ start: '', cap: 2, tools: { blocks: ['fwd', 'repeat'] } }],
  goal: { type: 'flags' }, solution: ['R6(f)'],
  hints: ['…', '…'],
}
```

Kısa yazım: `f` ileri, `l` sola dön, `r` sağa dön, `d` koş, `w` bekle, `b` kükre, `a` alarm çal,
`o` açıl, `c` kapan, `u` dikenleri çıkar, `n` dikenleri indir; `R4(…)` tekrarla, `F(…)` sürekli
tekrarla, `Iw(…)(…)` eğer önüm kapalıysa / değilse, `Ie(…)(…)` eğer şövalyeyi görüyorsam;
`@s(…)` başlayınca, `@e` görünce, `@c` altın, `@k` anahtar, `@p` düğme, `@a` alarm.
Derse bir şey açtırmak için `src/bloklar.js` içindeki `GIVES` tablosuna satır eklenir.

## Bilinen eksikler

- Değişken ve fonksiyon yok. Bilerek: önce bu kadarı çocuğun önüne konup izlenmeli, sonraki dersler
  onun takıldığı ve eğlendiği yere göre yazılmalı.
- Paylaşılan kaleyi oynayanın sonucu (kaç hamlede bitirdiği) kuran kişiye geri gitmez; sunucu yoktur.
