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

## İlk inceleme: hazır gelenler

| Bizim işimiz | Postiz'de hazır olan | Eksik olan |
|---|---|---|
| Türkçe arayüz | `tr` çevirisi tam (924 anahtarın 924'ü) | Makine çevirisi; elden geçirilmeli |
| Müşteri onayı | "Müşteriyle paylaş" önizleme sayfası (`/p/[id]`) ve yorumlar | Onay durumu, WhatsApp bildirimi |
| Müşteri bazlı çalışma | `Customer` modeli; kanallar müşteriye göre gruplanıyor | Müşteriye logo, iletişim bilgisi |
| Aylık rapor | Analitik ekranı ve verisi | PDF çıktı, ajans logosu, zamanlama |
| Özel gün takvimi | Takvim ekranı, taslak gönderi (`DRAFT`) | Türkiye özel gün verisi, taslak üretimi |
| TL tahsilat | Ödeme sağlayıcı soyutlaması (`payment.providers.ts`), Stripe | iyzico veya PayTR sağlayıcısı |
| Ajans markalı panel | Yok | Logo, renk, alan adı |
| E-ticaret bağlantısı | Yok | ikas, Ticimax, Trendyol |

## Yol haritası

- [x] Postiz'i al, depoya bağla
- [x] Kod yapısını ve Türkçe çeviriyi incele
- [x] Yerelde çalıştır (Node 22.23.4, pnpm 10.6.1, Docker)
- [x] Türkçeyi varsayılan dil yap (tarayıcı diline bakılmaz; kullanıcı dil menüsünden değiştirebilir)
- [x] Türkçe çeviriyi elden geçir, çevirideki marka adını Postacı yap
- [ ] Kodda sabit kalan İngilizce metinler (sekme başlıkları "Postiz ...", "Agent" menüsü)
- [ ] Logo ve renkleri Postacı'ya çevir
- [ ] Türkiye özel gün takvimi ve hazır taslak
- [ ] Ajans logolu aylık PDF rapor
- [ ] WhatsApp'tan müşteri onayı (tek gönderi ve aylık planın toplu onayı)
- [ ] Ajans markalı panel (logo ve alan adı)
- [ ] E-ticaret bağlantısı (ikas, Ticimax, Trendyol)
- [ ] TL ile abonelik tahsilatı
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

## Kod yapısı (kısa)

- `apps/frontend`: arayüz (React)
- `apps/backend`: API (NestJS)
- `apps/orchestrator`: zamanlanmış işler (Temporal)
- `libraries/nestjs-libraries`: ortak sunucu mantığı, veritabanı şeması (Prisma, PostgreSQL)
- `libraries/react-shared-libraries/src/translation/locales/tr`: Türkçe çeviri

Kod yazarken uyulacak kurallar `CLAUDE.md` içinde.
