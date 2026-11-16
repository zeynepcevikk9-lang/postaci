# Yayın rehberi (test / canlı)

Bu rehber uygulamayı ve tanıtım sitesini bir Plesk sunucusunda yayınlamak ve sonra başka bir
yere taşımak içindir. Depo herkese açık: bu dosyaya sunucu adresi, parola ya da iş notu YAZMAYIN.

## Önce bilinmesi gerekenler

- **Tanıtım sitesi** (`site/`) düz HTML/CSS: Plesk'te herhangi bir alan adının `httpdocs` klasörüne
  kopyalanır, başka bir şey gerekmez. Risksizdir.
- **Uygulama** daha ağır: Node.js 22, PostgreSQL, Redis, Temporal (kendi PostgreSQL ve Elasticsearch'üyle)
  ve bir nginx gerekir. Plesk'in Node.js eklentisiyle bunların hepsi çalışmaz; **Docker** gerekir
  (Plesk Docker eklentisi ya da sunucuda `docker compose`). Elasticsearch dahil yaklaşık 3-4 GB RAM
  ve birkaç GB disk planlayın.
- **Taşınabilirlik:** her şey `docker-compose.canli.yaml` içinde ve veriler adlandırılmış volume'lerde.
  Sonra başka sunucuya geçmek = volume yedeği + aynı compose + `.env.canli`.
- **Sunucu seçimi:** uygulama ajansların sosyal hesap anahtarlarını ve ödeme durumunu tutar. Çok siteli
  paylaşımlı bir Plesk sunucusunda, diğer sitelerden biri ele geçirilirse Docker/disk/ağ erişimi
  riski vardır. Test için kabul edilebilir; **gerçek müşteri verisi girmeden önce** uygulamayı kendi
  sunucusuna (ya da en azından Plesk'te kimsenin PHP çalıştırmadığı ayrı bir sunucuya) taşıyın.

## Adımlar

### 1. Alan adları
İki adres önerilir: tanıtım sitesi (`ornek.com`) ve uygulama (`uygulama.ornek.com`). İsim kesinleşmeden
test için geçici bir alt alan adı kullanın. Uygulamayı çevirirken sonra adres değişirse yalnızca
`.env.canli` içindeki adresler ve ters vekil ayarı güncellenir.

### 2. İmajı derleyin (Plesk sunucusunda DEĞİL)
Derleme yaklaşık 4-6 GB bellek ister ve uzun sürer; Plesk sunucusunu yormayın. Kendi bilgisayarınızda
ya da bir CI'da derleyip bir imaj deposuna (GitHub Container Registry, Harbor vb.) itin:

```bash
docker build -f Dockerfile.dev -t REGISTRY/postaci:test .
docker push REGISTRY/postaci:test
```

Not: `Dockerfile.dev` upstream'in geliştirme Dockerfile'ıdır; derlemeyi içinde yapar ve pm2 ile
backend, frontend ve orchestrator'ı başlatır. İlk derlemeden sonra imajı bir kez yerelde
`docker-compose.canli.yaml` ile açıp kayıt, giriş, gönderi kaydetme ve onay sayfasını deneyin.
Tarayıcı tarafı adresleri (`NEXT_PUBLIC_*`) imajın derlemede mi çalışırken mi okuduğu bu ilk
denemede doğrulanmalıdır (bu rehberi yazarken denenmedi).

### 3. Sunucuya yükleme
Sunucuda bir klasör açın (ör. `/opt/postaci`), şunları koyun:

- `docker-compose.canli.yaml`
- `dynamicconfig/` klasörü (depodan)
- `.env.canli` (`.env.canli.example` dosyasından; **izni `chmod 600`**)

```bash
docker login REGISTRY
docker compose -f docker-compose.canli.yaml --env-file .env.canli up -d
docker compose -f docker-compose.canli.yaml logs -f postaci
```

Uygulama yalnızca `127.0.0.1:4007` üzerinde dinler; internete doğrudan açılmaz.

### 4. Plesk'te alan adını uygulamaya bağlama
Alan adı → **Apache & nginx Ayarları** → "Ek nginx yönergeleri":

```nginx
location / {
    proxy_pass http://127.0.0.1:4007;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # ÖNEMLİ: gelen başlığı eklemeyin, EZİN. Aksi hâlde istemci sahte IP yazıp istek sınırını aşabilir.
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 2G;
    proxy_read_timeout 300s;
}
```

Alan adı Cloudflare arkasındaysa `$remote_addr` Cloudflare'in adresi olur; o durumda
`proxy_set_header X-Forwarded-For $http_cf_connecting_ip;` kullanın ve yalnızca Cloudflare adreslerinden
gelen isteklere izin verin. Plesk'ten Let's Encrypt sertifikası alın, "HTTP'den HTTPS'ye yönlendir" açık olsun.

### 5. Tanıtım sitesi
`site/` içeriğini ilgili alan adının `httpdocs` klasörüne kopyalayın. Yayından önce:

- `kullanim-kosullari.html` ve `gizlilik.html` TASLAKTIR: `[ŞİRKET UNVANI]`, `[ADRES]`, `[E-POSTA ADRESİ]`,
  `[TARİH]` gibi yer tutucuları doldurun ve bir avukata okutun. Doldurulmadan herkese açık yayınlamayın.
- Test aşamasında siteyi ve uygulamayı arama motorlarından ve meraklılardan saklamak için Plesk'te
  alan adına **"Parola korumalı dizin"** koyun (ya da `robots.txt` ile `Disallow: /`).

### 6. Canlıya çıkmadan önce (POSTACI.md "Güvenlik" ile aynı liste)
- [ ] `.env.canli`: `JWT_SECRET`, `POSTGRES_PASSWORD`, `TEMPORAL_DB_PASSWORD`, `ENCRYPTION_KEY` rastgele ve uzun; **`ENCRYPTION_KEY` yedeklendi**.
- [ ] `docker compose ... ps` çıktısında `7233`, `8080`, `5432` dışarıya yayınlanmıyor (yalnızca `127.0.0.1:4007`).
- [ ] Sunucu güvenlik duvarında yalnızca 80, 443 (ve yönetim için SSH) açık.
- [ ] İstek sınırı denemesi: art arda istekte 429 dönüyor; ters vekilin `X-Forwarded-For` ayarı doğru.
- [ ] Yedek: `postgres-volume`, `postaci-uploads`, `postaci-config` volume'leri ve `.env.canli` düzenli yedeklenir; **bir kez geri yükleme denenir**.
- [ ] iyzico: önce sandbox; canlıya geçerken webhook imzası + `IYZICO_MERCHANT_ID`.
- [ ] E-posta: gönderim denendi; SPF/DKIM/DMARC alan adı için ayarlı (aksi halde e-postalar spam'e düşer).
- [ ] Sızma testi / bağımsız inceleme (ödeme ve kimlik doğrulama).

## Başka sunucuya taşıma
1. Eski sunucuda `docker compose ... down` (veri kaybı olmaması için önce durdurun).
2. Volume'leri yedekleyin: `postgres-volume`, `postaci-uploads`, `postaci-config`, `temporal-db-data`.
3. Yeni sunucuda aynı klasör yapısı + `.env.canli` (**aynı `ENCRYPTION_KEY` ve `JWT_SECRET`**), volume'leri geri yükleyin, `up -d`.
4. DNS'i yeni sunucuya çevirin, sertifika alın, eski sunucuyu kapatın.

## Güncelleme
Yeni imajı derleyip itin, sunucuda `docker compose ... pull && docker compose ... up -d`. Kapsayıcı her
başlarken `prisma db push` ile veritabanı şemasını kendiliğinden günceller; sütun silen ya da tür
değiştiren bir şema değişikliği veri kaybettirebilir, bu yüzden **her güncellemeden önce
`postgres-volume` yedeği alın**.
