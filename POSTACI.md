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
- [ ] Müşteri onayı, 4. adım: WhatsApp Business API ile otomatik gönderim (başvuru gerekir)
- [x] Ajans markası, 1. adım: Ayarlar > Ajans Markası (ad, logo, renk); müşterinin gördüğü
      sayfalarda (önizleme, onay planı, rapor) Postacı yerine ajans görünür
- [ ] Ajans markası, 2. adım: ajansın kendi alan adı ve panelin kendisinde ajans logosu
- [x] E-ticaret bağlantısı, 1. adım: takvimde "Mağaza" düğmesi; mağazanın ürün XML adresi eklenir
      (ikas, Ticimax, T-Soft, IdeaSoft, Google Merchant), sonradan giren ürünler taslak önerisi olur.
      Adres yalnızca herkese açık https olabilir; iç ağ adresleri reddedilir.
- [ ] E-ticaret bağlantısı, 2. adım: ürün görselini taslağa ekleme, indirim/fiyat değişikliği,
      Trendyol satıcı API bağlantısı, arka planda kendiliğinden kontrol (şu an pencere açılınca kontrol edilir)
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
- [ ] Yönetim paneli, 2. adım: hesaba elle plan verme/kaldırma (havale ile ödeyenler), iade,
      hesap dondurma
- [ ] Tanıtım sitesi (ürün ana sayfası `site/` içinde; eksik: deneme kaydı formunun bağlanması, fiyatların kesinleşmesi, yayına alma)

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

Deneme kaydı formu, `index.html` içindeki `data-endpoint` özelliği doldurulana kadar kayıt
göndermez ve ziyaretçiye kaydın şu an alınamadığını söyler. Sayfa ürünü yayındaki haliyle
anlatır; anlatılan özellikler hazır olmadan yayına alınmamalıdır. Fiyatlar taslaktır.

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

## Kod yapısı (kısa)

- `apps/frontend`: arayüz (React)
- `apps/backend`: API (NestJS)
- `apps/orchestrator`: zamanlanmış işler (Temporal)
- `libraries/nestjs-libraries`: ortak sunucu mantığı, veritabanı şeması (Prisma, PostgreSQL)
- `libraries/react-shared-libraries/src/translation/locales/tr`: Türkçe çeviri

Kod yazarken uyulacak kurallar `CLAUDE.md` içinde.
