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
- [ ] Yerelde çalıştır (Node 22.23.4, pnpm 10.6.1, Docker)
- [ ] Ad, logo ve renkleri Postacı'ya çevir; Türkçeyi varsayılan dil yap
- [ ] Türkçe çeviriyi elden geçir
- [ ] Türkiye özel gün takvimi ve hazır taslak
- [ ] Ajans logolu aylık PDF rapor
- [ ] WhatsApp'tan müşteri onayı
- [ ] Ajans markalı panel (logo ve alan adı)
- [ ] E-ticaret bağlantısı (ikas, Ticimax, Trendyol)
- [ ] TL ile abonelik tahsilatı
- [ ] Tanıtım sitesi

Kodun dışında, başvurusu erken yapılması gerekenler: Meta, TikTok ve LinkedIn uygulama
onayları ile WhatsApp Business API.

## Kod yapısı (kısa)

- `apps/frontend`: arayüz (React)
- `apps/backend`: API (NestJS)
- `apps/orchestrator`: zamanlanmış işler (Temporal)
- `libraries/nestjs-libraries`: ortak sunucu mantığı, veritabanı şeması (Prisma, PostgreSQL)
- `libraries/react-shared-libraries/src/translation/locales/tr`: Türkçe çeviri

Kod yazarken uyulacak kurallar `CLAUDE.md` içinde.
