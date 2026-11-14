# Postacı

Postacı, [Postiz](https://github.com/gitroomhq/postiz-app) üzerine kurulan, Türkiye'deki
ajanslara yönelik bir sosyal medya planlama aracıdır. Bu dosya Postiz'in üzerine ne
eklediğimizi ve nerede olduğumuzu tutar. Postiz'in kendi belgeleri `README.md` içinde durur.

## Kaynak ve lisans

- Kaynak: `gitroomhq/postiz-app`, `main` dalı, `edcaefaf` commit'i (12 Kasım 2026'da alındı).
- Lisans: AGPL-3.0. `LICENSE` dosyası ve telif bildirimleri yerinde kalır.
- AGPL gereği, ürünü ağ üzerinden kullananlara değiştirilmiş kaynak kodu sunulmalıdır.
  Bu depo o kaynak koddur; yaptığımız değişiklikler burada tutulur.

## Depo düzeni

| Uzak depo | Adres | Ne için |
|---|---|---|
| `origin` | `zeynepcevikk9-lang/postaci` | Bizim kodumuz |
| `upstream` | `gitroomhq/postiz-app` | Postiz güncellemelerini almak |

Postiz'den güncelleme almak:

```bash
git fetch upstream
git merge upstream/main
```

Birleştirmeyi kolay tutmak için Postiz'in dosyalarını olabildiğince az değiştiriyor,
yeni özellikleri ayrı dosya ve modüllerde yazıyoruz.

Durum (15 Kas 2026): Postiz ana dalı `c22451b8` commit'ine kadar birleştirildi (birleştirme
öncesi hâl `yedek/birlestirme-oncesi-20261115` dalında, yalnızca yerelde). Çakışma yalnız
en/tr çeviri dosyalarında çıktı. Bu güncellemeyle gelenler:

- Gönderi kaydetme düzeltmesi (o olmadan yeni gönderi kaydı 404 veriyordu).
- Kanal anahtarlarını veritabanında şifreleme seçeneği. Varsayılan olarak kapalı; canlıya
  çıkarken `.env` içinde `ENCRYPTION_PROVIDER="local"` ve `ENCRYPTION_KEY` tanımlanmalı
  (`.env.example` içinde açıklaması var). Anahtar kaybolursa bütün kanallar yeniden bağlanır.
- Bağlantı ile kanal bağlama sayfası (`/integrations/connect/<kod>`): hesabı olmayan biri
  gönderilen bağlantıdan kendi sosyal hesabını bağlar. Bağlantı genel API ile üretilir.
- Veritabanı indeksleri (güncellemeden sonra `pnpm run prisma-db-push`).

Güncelleme aldıktan sonra sıra: `pnpm install`, `pnpm run prisma-db-push`,
`node araclar/postaci-marka.mjs`, arka ucu derle, sonra temel akışı (gönderi oluştur, taslak
kaydet) tarayıcıda dene. Bunlar denenmeden yayına çıkılmaz.

Renkler ve sekme başlıkları Postiz'in onlarca dosyasında sabit yazılıdır. Bunları elle
değil betikle çeviriyoruz; güncelleme aldıktan sonra betik yeniden çalıştırılır:

```bash
node araclar/postaci-marka.mjs
```

## İlk inceleme: hazır gelenler

| Bizim işimiz | Postiz'de hazır olan | Eksik olan |
|---|---|---|
| Türkçe arayüz | `tr` çevirisi tam (924 anahtarın 924'ü) | Makine çevirisi; elden geçirilmeli |
| Müşteri onayı | "Müşteriyle paylaş" önizleme sayfası (`/p/[id]`) ve yorumlar | Onay durumu, WhatsApp bildirimi |
| Müşteri bazlı çalışma | `Customer` modeli; kanallar müşteriye göre gruplanıyor | Müşteriye logo, iletişim bilgisi |
| Aylık rapor | Analitik ekranı ve verisi | PDF çıktı, ajans logosu, zamanlama |
| Özel gün takvimi | Takvim ekranı, taslak gönderi (`DRAFT`) | Türkiye özel gün verisi, taslak üretimi |
| TL tahsilat | Ödeme sağlayıcı soyutlaması (`payment.providers.ts`), Stripe | iyzico sağlayıcısı (yazıldı, aşağıya bakın) |
| Ajans markalı panel | Yok | Logo, renk, alan adı |
| E-ticaret bağlantısı | Yok | ikas, Ticimax, Trendyol |

## Yol haritası

- [x] Postiz'i al, depoya bağla
- [x] Kod yapısını ve Türkçe çeviriyi incele
- [x] Yerelde çalıştır (Node 22.23.4, pnpm 10.6.1, Docker)
- [x] Türkçeyi varsayılan dil yap (tarayıcı diline bakılmaz; kullanıcı dil menüsünden değiştirebilir)
- [x] Türkçe çeviriyi elden geçir, çevirideki marka adını Postacı yap
- [x] Sekme başlıkları ve "Agent" menüsü Türkçe ve Postacı adıyla
- [x] Logo, site simgesi ve ana renkler Postacı'ya çevrildi (`araclar/postaci-marka.mjs`)
- [ ] Kalan Postiz izleri: faturalandırma ekranındaki tanıtım metinleri (iyzico açıkken görünmez), abonelik iptal e-postası (İngilizce), tarayıcı eklentisi uyarısı
- [x] Türkiye özel gün takvimi ve hazır taslak (takvimin üstünde "Özel günler" şeridi; veri
      `special-days/tr.special.days.ts`; dini günler yıl yıl elle girilir, 2026 ve 2027 girildi)
- [x] Aylık rapor: takvimde "Aylık rapor" ile oluşturulur, müşteri sayfası `/p/report/<anahtar>`,
      rakamlar oluşturulduğu anda sabitlenir, "PDF olarak kaydet" tarayıcının yazdırma penceresini açar
- [x] Müşteri onayı, 1. adım: önizleme sayfasında "Onayla / Değişiklik iste", karar geçmişi,
      ajansa bildirim, "WhatsApp'ta paylaş" düğmesi (ajansın kendi WhatsApp'ından, wa.me ile)
- [x] Müşteri onayı, 2. adım: aylık planın tek bağlantıyla toplu onayı (takvimde "Onaya gönder";
      müşteri sayfası `/p/plan/<anahtar>`; aynı içeriğin bütün kanalları tek kalem; "Tümünü onayla")
- [x] Müşteri onayı, 3. adım: takvimde onay rozeti; planda "onaylanınca taslak zamanlansın" seçeneği
      (onaylanan taslak zamanlanır, değişiklik istenen zamanlanmış gönderi taslağa döner)
- [x] Müşteri onayı, gönderilen planlar: "Onaya gönder" penceresinde gönderilen planların listesi
      (kaç gönderi onaylandı, kaçı bekliyor, kaçında değişiklik istendi), bekleyene WhatsApp'tan
      hatırlatma, planı kaldırma; düğmede yanıt bekleyen plan sayısı
- [x] Panel teması: renkler `apps/frontend/src/app/postaci.theme.scss` içinde (Postiz'in
      `colors.scss` dosyasına dokunulmaz); sıcak açık zemin, beyaz kartlar, mürekkep rengi
      (`#14172b`) yazı ve düğmeler, mercan (`#ff6b4a`) vurgu; mavi-mor tonlar kullanılmaz; koyu tema
      sıcak koyu zemin ve mercan düğmeler; logo mercan zarf; takvim varsayılan olarak ay görünümünde
      açılır
- [x] Ana sayfa (`/home`): giriş yapan kullanıcı buraya düşer; üstte "Gönderi oluştur" ve
      "Asistana hazırlat", özet sayılar (bağlı kanal, 7 günde paylaşılacak, yanıt bekleyen plan, yeni
      ürün), hızlı işlemler, önümüzdeki 7 gün, son paylaşılanlar ve her birinin etkileşimi
      (beğeni, yorum, erişim penceresi), müşterilerden gelen onay ve notlar
      (`GET /approvals/activity`), onay bekleyen planlar, yaklaşan özel günler. Menünün ilk öğesi.
      `/launches?new=1` gönderi düzenleyicisini açar.
- [x] Hesap türü: Ayarlar > Marka içinde "Ajans" ya da "İşletme". İşletme kipinde müşteri seçimi ve
      müşteriye onaya gönderme gizlenir, "Ajans Markası" yerine "Marka" yazar
      (`components/layout/account.type.tsx`; tür `AgencyBrand.accountType` alanında durur).
- [ ] Müşteri onayı, 4. adım: WhatsApp Business API ile otomatik gönderim (başvuru gerekir)
- [x] Ajans markası, 1. adım: Ayarlar > Ajans Markası (ad, logo, renk); müşterinin gördüğü
      sayfalarda (önizleme, onay planı, rapor) Postacı yerine ajans görünür
- [x] Ajans markası, 2. adım: ajans logo seçtiyse panelin sol üstünde Postacı simgesi yerine o görünür
- [ ] Ajans markası, 3. adım: ajansın kendi alan adı
- [x] E-ticaret bağlantısı, 1. adım: takvimde "Mağaza" düğmesi; mağazanın ürün XML adresi eklenir
      (ikas, Ticimax, T-Soft, IdeaSoft, Google Merchant), sonradan giren ürünler taslak önerisi olur.
      Adres yalnızca herkese açık https olabilir; iç ağ adresleri reddedilir.
- [x] E-ticaret bağlantısı, 2. adım: "Taslak oluştur" ürün görselini medya kütüphanesine alıp taslağa
      ekler; mağazalar arka planda saatte bir kontrol edilir (altı saattir okunmamış olanlar) ve
      yeni ürün gelince hesaba bildirim düşer
- [ ] E-ticaret bağlantısı, 3. adım: indirim/fiyat değişikliği, Trendyol satıcı API bağlantısı
- [x] TL ile abonelik tahsilatı, 1. adım: iyzico sağlayıcısı (plan seçme ekranı, iyzico ödeme formu,
      deneme süresi, yenileme ve başarısız ödeme bildirimi, dönem sonuna kadar kullanımla iptal,
      ödeme geçmişi). Yalnızca depodaki sahte iyzico sunucusuyla denendi.
- [ ] TL ile abonelik tahsilatı, 2. adım: iyzico'nun deneme ortamıyla sınama (hesap gerekir),
      plan değiştirme, kart güncelleme, iptal e-postasının Türkçesi, fatura (e-arşiv) akışı
- [x] Yönetim paneli, 1. adım: `/admin/customers` (yalnızca süper yönetici). Bütün hesaplar plan,
      abonelik durumu, kanal/gönderi/müşteri sayısı ve son girişle listelenir; özet kutuları ve
      tahmini aylık gelir; "Hesaba gir" ile hesap sahibinin gözünden açılır. Postiz'den gelen
      `/admin/stats` ve `/admin/errors` sayfaları da duruyor. Süper yönetici, veritabanında
      `User.isSuperAdmin` alanı açılarak tanımlanır.
- [x] Yönetim paneli, 2. adım: "Planı düzenle" ile hesaba elle plan verme (havale ile ödeyenler;
      bitiş tarihi yazılırsa o gün kendiliğinden kapanır) ve aboneliği kaldırma (kartlı abonelik
      iyzico'da da hemen iptal edilir, iade yapılmaz). Kartla süren abonelik varken elle plan
      verilmez. Elle verilen planı kullanıcı kendisi iptal edemez.
- [x] Havale / EFT ile satış: plan ekranında banka bilgileri ve ödeme bildirimi, yönetim panelinde
      onay/ret, onayda planın elle tanımlanması, havale ile yenileme
- [ ] Yönetim paneli, 3. adım: iade (şimdilik iyzico panelinden), hesap ayrıntı sayfası
      (ödeme geçmişi, notlar), bitişi yaklaşan elle planlar için hatırlatma
- [ ] Tanıtım sitesi (ürün ana sayfası `site/` içinde; yeni tasarım yapıldı, düğmeler panele bağlandı,
      fiyatlar kesinleşti; eksik: yayına alma, yasal sayfalar, iletişim adresi)
- [x] Türkçe taraması: kodda kullanılıp Türkçesi olmayan 261 metin çevrildi; doğrudan İngilizce
      yazılmış metinler ve uyarılar `araclar/postaci-marka.mjs` ile Türkçeleştiriliyor; arka ucun
      bildirim ve e-posta metinleri `services/turkish.messages.ts` üzerinden Türkçeye çevriliyor;
      karşılama penceresi kanal bağlama adımıyla bitiyor (Postiz videosu ve bağlayıcı adımı yok)

Kodun dışında, başvurusu erken yapılması gerekenler: Meta, TikTok ve LinkedIn uygulama
onayları ile WhatsApp Business API.

## Yerelde çalıştırma

Gerekenler: Docker, pnpm 10.6.1 (`npm install -g pnpm@10.6.1`). Node 22.23.4'ü pnpm
kendisi indirir; bunun için komutlardan önce `npm_config_use_node_version=22.23.4`
ortam değişkeni verilir (sistemde kurulu Node'a dokunmaz).

```bash
# 1. Veritabanı, Redis ve Temporal
docker compose -f docker-compose.dev.yaml up -d postiz-postgres postiz-redis temporal

# 2. Ayar dosyası: .env.example'ı .env olarak kopyalayın, şunları değiştirin:
#    DATABASE_URL  -> postgresql://postiz-local:postiz-local-pwd@localhost:5432/postiz-db-local
#    JWT_SECRET    -> uzun rastgele bir değer
#    UPLOAD_DIRECTORY ve NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY ("/uploads")

# 3. Bağımlılıklar ve tablolar
npm_config_use_node_version=22.23.4 pnpm install
npm_config_use_node_version=22.23.4 pnpm run prisma-db-push

# 4. Uygulama (her biri ayrı terminalde)
npm_config_use_node_version=22.23.4 pnpm --filter ./apps/backend run dev        # :3000
npm_config_use_node_version=22.23.4 pnpm --filter ./apps/frontend run dev       # :4200
npm_config_use_node_version=22.23.4 pnpm --filter ./apps/orchestrator run dev   # gönderi yayımlamak için
```

Notlar:

- Arka ucun ilk derlemesi 4–5 dakika sürer. Depodaki herhangi bir dosya değişince yeniden
  derlenir ve yaklaşık bir dakika yanıt vermez.
- Arka uç izleme kipinde (`run dev`) ön yüz çalışırken sürekli yeniden derlemeye girip hiç
  açılmayabilir. O durumda bir kez derlenmiş hali doğrudan çalıştırın:
  `cd apps/backend && pnpm exec dotenv -e ../../.env -- node dist/apps/backend/src/main`
- Veritabanı şeması değişince arka ucu durdurup `pnpm run prisma-db-push` çalıştırın;
  arka uç açıkken istemci dosyası kilitli olduğu için üretim adımı hata verir.
- Bellek: arka uç, ön yüz, zamanlayıcı ve Docker birlikte 16 GB'lık makinede belleği
  doldurur; boş bellek bitince arka uç hata vermeden açılmadan bekler. Paneli görmek için
  zamanlayıcı (orchestrator) gerekmez, kapalı tutulabilir.

## Tanıtım sitesi

`site/` klasöründe, derleme adımı olmayan düz HTML/CSS. pnpm çalışma alanının dışındadır.

```bash
node site/serve.mjs   # http://localhost:4300
```

Tasarım (15 Kas 2026): posta kimliği, panelle aynı palet. Mürekkep rengi (`#14172b`) zemin, kâğıt
tonu ve mercan; mavi-mor ton yok; posta damgası tekrar eden motif; başlıklarda Bricolage Grotesque.
Üst menü 1020px altında açılır menüye geçer. Bölümler: giriş
(takvim kartı, WhatsApp balonu), kanallar, dört duraklı yolculuk, farklı boyda özellik kutuları,
öncesi/sonrası, fiyatlar, sorular, zarf biçiminde çağrı.

Kayıt formu yoktur; "Ücretsiz deneyin" ve "Giriş yap" düğmeleri panele gider. Panelin adresi
`index.html` başındaki `data-app-url` özniteliğindedir (yerelde `http://localhost:4200`); yayına
alırken panelin gerçek adresiyle değiştirilir. Sayfa ürünü yayındaki haliyle anlatır; üründe
karşılığı olmayan bir özellik ya da kanıtı olmayan bir iddia (müşteri sayısı, yorum) yazılmaz.

Planlar (15 Kas 2026): İşletme, Başlangıç, Ajans, Büyük Ajans; sınır bağlı sosyal medya hesabı
sayısıdır (3 / 10 / 30 / 100). Kademe karşılıkları `pricing.ts` içinde: STANDARD = İşletme,
TEAM = Başlangıç, PRO = Ajans, ULTIMATE = Büyük Ajans; ekip üyeleri Ajans planından itibaren.
Müşteri sayısı sınırsızdır. Kalıcı ücretsiz plan yoktur; 7 gün kartla ücretsiz deneme vardır. Fiyatlar sitede ve
iyzico panelindeki planlarda durur; sitedeki fiyat değişirse iyzico'daki plan da değiştirilmelidir.

## iyzico ile TL abonelik

Kod: `services/payment/providers/iyzico.provider.ts` (sağlayıcı), `database/prisma/iyzico/`
(ödeme formu kayıtları), `api/routes/iyzico.controller.ts`, ön yüzde
`components/billing/iyzico.billing.component.tsx`.

Nasıl çalışır:

- Planlar iyzico panelinde tanımlanır (Abonelik > Ürün ve ödeme planı). Her planın referans kodu
  `.env` içine yazılır: `IYZICO_PLAN_<STANDARD|TEAM|PRO|ULTIMATE>_<MONTHLY|YEARLY>`. Plan adı,
  fiyatı ve deneme süresi iyzico'dan okunur; depoda fiyat yoktur. Kanal sayısı gibi sınırlar
  Postiz'in `pricing.ts` dosyasındaki kademeden gelir.
- Kullanıcı planı seçer, fatura bilgilerini yazar; kart bilgisi iyzico'nun formuna girilir, bize
  ulaşmaz. Ödeme bitince iyzico tarayıcıyı `/public/iyzico/callback` adresine gönderir.
- iyzico doğrunun kaynağıdır: ödeme dönüşü ve webhook yalnızca "şu aboneliği yeniden oku" der,
  durum her seferinde iyzico API'sinden alınır.
- Ödeme alınamazsa kullanıcıya bildirim gider ve 3 gün süre tanınır. İptal edilen abonelik,
  ödemesi alınmış dönemin sonuna kadar kullanılır. Süresi biten abonelikleri arka uç açılışta
  ve saatte bir kapatır (kanallar devre dışı kalır).
- Ödeme yapılıp tarayıcı bize dönmezse (sekme kapanır, bağlantı kopar) abonelik yine tanınır:
  ilk webhook'ta ve saatlik kontrolde bekleyen formlar iyzico'ya sorulur.
- Abonelik yalnızca iyzico açıkça "iptal edildi" ya da "süresi doldu" derse kaldırılır; okunamayan
  ya da tanınmayan bir durumda hiçbir şeye dokunulmaz.
- Deneme süreli bir planın denemesiz eşi `IYZICO_PLAN_..._NO_TRIAL` ile verilir; daha önce abone
  olmuş hesap onunla başlar. Verilmezse eski aboneler yeniden deneme alabilir.
- Webhook imzası iyzico'da açtırılana kadar webhook adresi imzasız istek kabul eder. Bu isteklerin
  içeriğine güvenilmez, yalnızca aboneliğin iyzico'dan yeniden okunmasını tetikler.
- Bilinen sınırlar: plan değiştirme ve kart güncelleme yok; iptal geri alınamaz (dönem bitince
  yeniden abone olunur); iyzico panelinden elle "yükseltme" yapılırsa abonelik düşer.

Canlıya almak için gerekenler:

1. iyzico üye işyeri hesabı ve hesapta abonelik ürününün açılması.
2. `.env`: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` (yazılmazsa deneme ortamı),
   plan kodları, `PAYMENT_PROVIDER_WEB="iyzico"`. Ücretli kip Postiz'in bayrağıyla açılır:
   `STRIPE_PUBLISHABLE_KEY` ve `STRIPE_SECRET_KEY` boş olmayan bir değer olmalıdır.
3. iyzico panelinde abonelik bildirim adresi: `<arka uç adresi>/payment/iyzico`. Webhook imzası
   iyzico'dan e-postayla açtırılır; açılınca `IYZICO_MERCHANT_ID` yazılır ve imzasız istekler
   reddedilir.
4. iyzico'nun deneme ortamında (sandbox) uçtan uca deneme. Yanıt biçimleri belgelere göre yazıldı,
   gerçek iyzico ile henüz denenmedi.

Hesap olmadan yerelde denemek için sahte bir iyzico sunucusu vardır (gerçek ödeme yoktur):

```bash
node araclar/iyzico-sahte.mjs   # http://localhost:4400
```

`.env` içine `IYZICO_BASE_URL="http://localhost:4400"`, `IYZICO_API_KEY="sahte-api-key"`,
`IYZICO_SECRET_KEY="sahte-secret-key"` ve dosyanın başında yazan plan kodları yazılır. Yenileme
ve başarısız ödeme şöyle denenir:
`curl -X POST "http://localhost:4400/sahte/olay?ref=<abonelik kodu>&tur=failure"`

## Havale / EFT ile satış

iyzico hesabı olmadan da satış yapılabilir; iyzico kuruluysa havale ikinci ödeme yolu olarak
görünür. Kod: `database/prisma/bank-transfer/`, `api/routes/bank.transfer.controller.ts`,
ön yüzde `components/billing/bank.transfer.tsx`.

- `.env` içine `BANK_TRANSFER_IBAN` ve `BANK_TRANSFER_ACCOUNT_NAME` yazılınca plan ekranında
  "Havale / EFT ile öde" çıkar. iyzico kurulu değilse plan adı ve fiyatı `PLAN_NAME_<KADEME>` ve
  `PLAN_PRICE_<KADEME>_<DÖNEM>` değişkenlerinden okunur. Ücretli kip yine Postiz bayrağıyla
  açılır (`STRIPE_PUBLISHABLE_KEY` ve `STRIPE_SECRET_KEY` boş olmayan bir değer).
- Kullanıcı planı seçer; IBAN, alıcı, tutar ve hesaba özel açıklama kodunu (`PST-XXXXXX`) görür,
  ödemeyi yapınca "Havaleyi yaptım, bildir" der. Tutar plandan alınır, kullanıcıdan değil.
- Bildirim yönetim panelinde (`/admin/customers`) "Havale bildirimleri" altında görünür;
  `BANK_TRANSFER_NOTIFY_EMAIL` yazılıysa e-postayla da gelir. Ödeme banka hesabında görülünce
  "Onayla" denir: plan bir ay ya da bir yıl için elle tanımlanır (hesabın süren elle planı varsa
  süre onun bitişinden uzar) ve kullanıcıya bildirim gider. Ödeme otomatik doğrulanmaz.
- Süresi dolan plan kendiliğinden kapanır; kullanıcı faturalandırma ekranındaki "Havale / EFT ile
  yenile" ile aynı yoldan yeniler.

## Kod yapısı (kısa)

- `apps/frontend`: arayüz (React)
- `apps/backend`: API (NestJS)
- `apps/orchestrator`: zamanlanmış işler (Temporal)
- `libraries/nestjs-libraries`: ortak sunucu mantığı, veritabanı şeması (Prisma, PostgreSQL)
- `libraries/react-shared-libraries/src/translation/locales/tr`: Türkçe çeviri

Kod yazarken uyulacak kurallar `CLAUDE.md` içinde.
