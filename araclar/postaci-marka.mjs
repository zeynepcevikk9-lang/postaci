// Postacı marka uygulayıcı.
// Postiz'in ön yüzündeki sabit renkleri ve sekme başlıklarını Postacı'ya çevirir.
// Tekrar çalıştırmak güvenlidir; Postiz'den güncelleme (git merge upstream/main)
// alındıktan sonra yeniden çalıştırılır.
//
// Kullanım (depo kökünden):  node araclar/postaci-marka.mjs

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'apps', 'frontend', 'src');

// Postiz rengi -> Postacı rengi (büyük/küçük harf fark etmez)
const colors = {
  '#612bd3': '#3d4fe0', // ana renk
  '#612ad5': '#3d4fe0',
  '#5520cb': '#2f3ec2', // ana rengin üzerine gelince
  '#fc69ff': '#ff6b4a', // vurgu rengi
  '#3900b2': '#2f3ec2', // açık tema: seçili öğe yazısı
  '#ebe8ff': '#e8ebff', // açık tema: seçili öğe zemini
  '#2d1b57': '#1b2457', // açık tema: pencere arkası
};

// Sekme başlıkları ve menüdeki sabit metinler
const texts = [
  ["isGeneralServerSide() ? 'Postiz Calendar' : 'Gitroom Launches'", "isGeneralServerSide() ? 'Postacı Takvim' : 'Gitroom Launches'"],
  ["isGeneralServerSide() ? 'Postiz' : 'Gitroom'", "isGeneralServerSide() ? 'Postacı' : 'Gitroom'"],
  ["'Postiz - Agent'", "'Postacı Asistan'"],
  ['} Preview`', '} Önizleme`'],
  ['} Admin Errors`', '} Yönetim: Hatalar`'],
  ['} Admin Stats`', '} Yönetim: İstatistikler`'],
  ['} Analytics`', '} Analitik`'],
  ['} Lifetime deal`', '} Ömür boyu plan`'],
  ['} Billing`', '} Faturalandırma`'],
  ['} Media`', '} Medya`'],
  ['} Settings`', '} Ayarlar`'],
  ['} Forgot Password`', '} Şifremi unuttum`'],
  ['} Login`', '} Giriş`'],
  ['} Register`', '} Kayıt`'],
  ['} - Activate your account`', '} - Hesabınızı etkinleştirin`'],
  ["name: 'Agent',", "name: 'Asistan',"],
  // Çıkış düğmesi: Türkçede yalnızca "Çıkış yap" yazar, marka adı eklenmez
  ["isGeneral ? ' Postiz' : ' Gitroom'", "isGeneral ? '' : ' Gitroom'"],
  // Varsayılan tema: açık (kullanıcı sağ üstteki simgeyle koyuya geçebilir)
  ["useCookie('mode', 'dark')", "useCookie('mode', 'light')"],
  ["'dark text-primary !bg-primary'", "'light text-primary !bg-primary'"],
  ['Theme.DARK', 'Theme.LIGHT'],
  // Ayarlar > saat biçimi seçenekleri
  ["label: 'AM:PM'", "label: '12 saat (ÖÖ/ÖS)'"],
  ["label: '24 hours'", "label: '24 saat'"],
];

// Postiz'de çeviri sistemine bağlanmamış, doğrudan İngilizce yazılmış metinler.
// Etiket/yer tutucu özniteliklerinde (label, placeholder, title, alt, aria-label)
// ve iki etiket arasındaki düz metinde birebir eşleşince Türkçesiyle değiştirilir.
const hardcoded = {
  'Login to use the wizard to generate API code': 'API kodu üreten sihirbazı kullanmak için giriş yapın',
  'Your browser does not support the video tag.': 'Tarayıcınız video oynatmayı desteklemiyor.',
  'This user is already activated,': 'Bu kullanıcı zaten etkinleştirilmiş,',
  'New Password': 'Yeni şifre',
  'Repeat Password': 'Şifreyi yineleyin',
  'Should we sync the current last post?': 'Şu anki son gönderi de eşitlensin mi?',
  'Autogenerate content': 'İçerik otomatik üretilsin',
  'Generate Picture?': 'Görsel üretilsin mi?',
  "Your trial has ended and your plan's first payment was charged.": 'Deneme süreniz bitti ve planınızın ilk ödemesi alındı.',
  'Enter your code': 'Kodunuzu girin',
  'Cancel my subscription': 'Aboneliğimi iptal et',
  'We will store your cookies securely to facilitate the connection.': 'Bağlantıyı kurabilmek için oturum bilgilerinizi güvenli biçimde saklarız.',
  'Bot Picture': 'Bot görseli',
  'Verified account': 'Doğrulanmış hesap',
  'Pick time': 'Saat seçin',
  'Select Frame': 'Kare seç',
  'From Gallery': 'Galeriden',
  'Save Changes': 'Değişiklikleri kaydet',
  'Current thumbnail': 'Şimdiki küçük görsel',
  'No channels': 'Kanal yok',
  'Type your image generation prompt here...': 'Üretilecek görseli burada tarif edin...',
  'Write the user details': 'Kullanıcı adı ya da e-postası yazın',
  'Select Organization': 'Organizasyon seçin',
  'Select organization': 'Organizasyon seçin',
  'End trial and pay now': 'Denemeyi bitir ve şimdi öde',
  'Go to previous page': 'Önceki sayfa',
  'Go to next page': 'Sonraki sayfa',
  'Remove delay': 'Gecikmeyi kaldır',
  'Custom min': 'Özel dk',
  'Copy Code': 'Kodu kopyala',
  'Add a thread finisher': 'Zincir sonu gönderisi ekle',
  'Save Set': 'Seti kaydet',
  "We don't have autocomplete for this social media": 'Bu kanal için otomatik tamamlama yok',
  'No results found': 'Sonuç bulunamadı',
  'Canonical Link': 'Özgün bağlantı (canonical)',
  'Cover picture': 'Kapak görseli',
  'Select Channel': 'Kanal seçin',
  'Select a team': 'Ekip seçin',
  'Most relevant': 'En alakalı',
  'Post Type': 'Gönderi türü',
  'Event Details': 'Etkinlik ayrıntıları',
  'Offer Details': 'Teklif ayrıntıları',
  'Call to Action': 'Eylem düğmesi',
  'Call to Action URL': 'Eylem düğmesi bağlantısı',
  'Event Title': 'Etkinlik başlığı',
  'Event name': 'Etkinlik adı',
  'Start Date': 'Başlangıç tarihi',
  'End Date': 'Bitiş tarihi',
  'Valid until...': 'Son geçerlilik...',
  'Select publication': 'Yayın seçin',
  'Graduation Strategy': 'Deneme sonrası yayın biçimi',
  'Search Community': 'Topluluk ara',
  'Select List': 'Liste seçin',
  'Select Template': 'Şablon seçin',
  'Select Group': 'Grup seçin',
  'My Timeline': 'Zaman tünelim',
  'Post To': 'Paylaşılacak yer',
  'Select board': 'Pano seçin',
  'Select Pin Color': 'Pin rengi seçin',
  'Please add at least one Subreddit from the settings': 'Lütfen ayarlardan en az bir subreddit ekleyin',
  'Search Subreddit': 'Subreddit ara',
  'Select Label': 'Etiket seçin',
  'Link URL': 'Bağlantı adresi',
  'Source URL': 'Kaynak adresi',
  'Message Type': 'Mesaj türü',
  'Announcement Color': 'Duyuru rengi',
  'Search Channel': 'Kanal ara',
  'Select Company': 'Şirket seçin',
  'Select Forum': 'Forum seçin',
  'Select type': 'Tür seçin',
  'WordPress Tags': 'WordPress etiketleri',
  'Privacy Status': 'Gizlilik durumu',
  'Made for kids': 'Çocuklara özel',
  'Open menu': 'Menüyü aç',
  'This provider has no configurable settings.': 'Bu kanalın ayarlanabilir bir seçeneği yok.',
  'Manage your content sets for easy reuse across posts.': 'Gönderilerde yeniden kullanmak için içerik setlerinizi yönetin.',
  'Add a set': 'Set ekle',
  'Set Name': 'Set adı',
  'Enter a name for this set': 'Bu set için bir ad yazın',
  'Full GitHub URL': 'Tam GitHub adresi',
  'Date Metrics': 'Tarih aralığı',
  'Write your signature...': 'İmzanızı yazın...',
  'Auto add signature?': 'İmza otomatik eklensin mi?',
  'Previous slide': 'Önceki',
  'Next slide': 'Sonraki',
  'No Integrations Yet': 'Henüz bağlantı yok',
  'API Key': 'API anahtarı',
  'API key': 'API anahtarı',
  'Loading voices...': 'Sesler yükleniyor...',
  'Select a Voice': 'Bir ses seçin',
  'Please wait...': 'Lütfen bekleyin...',
  'Authorization Error': 'Yetkilendirme hatası',
  'Access your integrations and channels': 'Bağlantılarınıza ve kanallarınıza erişme',
  'Create and schedule posts on your behalf': 'Sizin adınıza gönderi oluşturma ve zamanlama',
  'Read your post analytics': 'Gönderi analitiğinizi okuma',
  'Sign in to Postiz': 'Postacı ile giriş yapın',
  'Use self-hosted': 'Kendi sunucumu kullan',
  'Your instance has to be reachable from the internet over https.': 'Sunucunuz internetten https ile erişilebilir olmalı.',
  'Instance URL': 'Sunucu adresi',
};

// Çeviri sistemine bağlanmamış uyarı ve onay mesajları (tek tırnaklı sabit metin).
const messages = {
  'Successfully claimed the code': 'Kod başarıyla kullanıldı',
  'Code already claimed or invalid code': 'Kod daha önce kullanılmış ya da geçersiz',
  'Subscription updated successfully': 'Abonelik güncellendi',
  'Please fill all required fields': 'Lütfen zorunlu alanları doldurun',
  'Video generation failed': 'Video üretilemedi',
  'Failed to load profile': 'Profil yüklenemedi',
  'Please type your prompt': 'Lütfen isteğinizi yazın',
  'Copied to clipboard': 'Panoya kopyalandı',
  'Upload current in progress, please wait and then try again.':
    'Şu an bir yükleme sürüyor; lütfen bitmesini bekleyip yeniden deneyin.',
  'Code copied to clipboard': 'Kod panoya kopyalandı',
  'Plug updated': 'Eklenti güncellendi',
  'Set saved successfully': 'Set kaydedildi',
  'Failed to save set': 'Set kaydedilemedi',
  'Set deleted successfully': 'Set silindi',
  'Repository not found': 'Depo bulunamadı',
  'Signature deleted successfully': 'İmza silindi',
  'Integration deleted successfully': 'Bağlantı silindi',
  'Integration added successfully': 'Bağlantı eklendi',
  'Are you sure you want to delete this integration?':
    'Bu bağlantıyı silmek istediğinize emin misiniz?',
};

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const messagesRe = new RegExp(
  "((?:toast|toaster)\\.show\\(\\s*|deleteDialog\\(\\s*)'(" +
    Object.keys(messages).map(escapeRe).join('|') +
    ")'",
  'g'
);
const hardcodedRe = new RegExp(
  '(\\b(?:label|placeholder|title|alt|aria-label)=")(' +
    Object.keys(hardcoded).map(escapeRe).join('|') +
    ')(")|(>\\s*)(' +
    Object.keys(hardcoded).map(escapeRe).join('|') +
    ')(\\s*<)',
  'g'
);

// Dosyaya özel düzeltmeler (satır sonu \n ya da \r\n olabilir).
// Karşılama penceresi: Postiz'in yapay zekâ bağlayıcıları ve İngilizce tanıtım
// videosu adımları Postacı'da gösterilmez; kanal bağlama adımıyla biter.
const patches = [
  [
    /(      t\('connect_channels', 'Connect Channels'\),\r?\n)      t\('connect_agents', 'Connect Agents'\),\r?\n      t\('watch_tutorial', 'Watch Tutorial'\),\r?\n/,
    '$1',
  ],
  [
    /onNext=\{\(\) => setStep\(2\)\}(\r?\n\s*)onSkip=\{\(\) => setStep\(2\)\}/,
    'onNext={onClose}$1onSkip={onClose}',
  ],
];

const colorExt = new Set(['.tsx', '.ts', '.scss', '.css']);
const textExt = new Set(['.tsx', '.ts']);
const colorRe = new RegExp(Object.keys(colors).join('|'), 'gi');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

let changed = 0;
let colorHits = 0;
let textHits = 0;
for (const file of walk(src)) {
  const ext = extname(file);
  if (!colorExt.has(ext)) continue;
  const before = readFileSync(file, 'utf8');
  let after = before.replace(colorRe, (m) => {
    colorHits++;
    const to = colors[m.toLowerCase()];
    // Kaynaktaki harf büyüklüğünü koru (#612BD3 -> #3D4FE0)
    return m === m.toUpperCase() ? to.toUpperCase() : to;
  });
  if (textExt.has(ext)) {
    for (const [from, to] of texts) {
      if (after.includes(from)) {
        textHits += after.split(from).length - 1;
        after = after.split(from).join(to);
      }
    }
    if (ext === '.tsx') {
      after = after.replace(hardcodedRe, (m, a1, en1, a3, t1, en2, t3) => {
        textHits++;
        return en1 !== undefined
          ? a1 + hardcoded[en1] + a3
          : t1 + hardcoded[en2] + t3;
      });
      after = after.replace(messagesRe, (m, call, en) => {
        textHits++;
        return call + "'" + messages[en] + "'";
      });
      after = after.replace(
        'deleteDialog(`Are you sure you want to delete ${data.name}?`)',
        'deleteDialog(`${data.name} silinsin mi?`)'
      );
      for (const [from, to] of patches) {
        if (from.test(after)) {
          textHits++;
          after = after.replace(from, to);
        }
      }
    }
  }
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

console.log(`Değişen dosya: ${changed} | renk: ${colorHits} | metin: ${textHits}`);
