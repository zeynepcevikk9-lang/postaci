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
  '#612bd3': '#14172b', // ana renk: mürekkep (lacivert-siyah)
  '#612ad5': '#14172b',
  '#5520cb': '#262a45', // ana rengin üzerine gelince
  '#fc69ff': '#ff6b4a', // vurgu rengi: mercan
  '#3900b2': '#14172b', // açık tema: seçili öğe yazısı
  '#ebe8ff': '#f1ece1', // açık tema: seçili öğe zemini
  '#2d1b57': '#14172b', // açık tema: pencere arkası
  // Postacı'nın önceki mavi paleti (15 Kas 2026'da bırakıldı)
  '#3d4fe0': '#14172b',
  '#2f3ec2': '#262a45',
  '#e8ebff': '#f1ece1',
  '#1b2457': '#14172b',
  // Postiz'in dağınık kalan mor tonları
  '#662fda': '#14172b',
  '#5720cb': '#262a45',
  '#7640e0': '#262a45', // düğme üzerine gelince
  '#5023b8': '#262a45',
  '#7b3ff2': '#14172b',
  '#8c66ff': '#ff6b4a',
  '#622ff6': '#ff6b4a', // seçili kanalın çerçevesi
  '#ae8afc': '#d6472a', // metin içindeki bahsetmeler ve bağlantılar
  '#b69dec': '#d6472a',
  '#622aff': '#ff6b4a', // karşılama penceresindeki geçişli düğme
  '#8b5cf6': '#ff8a66',
  '#7c3aff': '#f25a39',
  '#9d6eff': '#ff7d5c',
  '#a78bfa': '#ff8a66',
  '#c4b5fd': '#ffc2b3',
  '#4f46e5': '#14172b', // kaydırma çubuğu dolgusu
  // Postiz'in pembe ikincil düğmeleri ve bildirim noktası: mercan
  '#d82d7e': '#ff6b4a',
  '#ff3ea2': '#ff6b4a',
  // Boş medya kütüphanesi görselindeki açık mor tonlar: açık mercan
  '#dacbfb': '#ffd0c4',
  '#e7ddfe': '#ffe3db',
};

// Sekme başlıkları ve menüdeki sabit metinler
const texts = [
  // Mor gölgeler: yeni palette nötr gölge
  ['shadow-purple-500/25', 'shadow-black/10'],
  ['shadow-purple-500/40', 'shadow-black/20'],
  // Bağlantı ile kanal bağlama sayfasındaki logo
  ['src="/postiz.svg"', 'src="/favicon.svg"'],
  ['alt="Postiz"', 'alt="Postacı"'],
  ["title: 'Connect Channel',", "title: 'Kanal bağlama',"],
  // Kanal ekleme penceresinin başlığı (davet kipinde ne seçildiği anlaşılsın)
  [
    "      title: 'Add Channel',",
    "      title: invite ? 'Davet bağlantısı: kanal türünü seçin' : 'Kanal Ekle',",
  ],
  // Gönderi önizlemesinde kanal seçilmemişken görünen ad
  ["current === 'global' ? 'Global Edit'", "current === 'global' ? 'Genel düzenleme'"],
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
  // Yönetici çubuğu: renkleri postaci.theme.scss içindeki sınıfla sadeleşir
  ['"bg-forth h-[52px] mobile:h-auto', '"postaci-admin-bar bg-forth h-[52px] mobile:h-auto'],
  // Yönetim sayfaları (istatistik, hatalar)
  ["label: 'Today'", "label: 'Bugün'"],
  ["label: 'This week'", "label: 'Bu hafta'"],
  ["label: 'This month'", "label: 'Bu ay'"],
  ["label: 'Last 7 days'", "label: 'Son 7 gün'"],
  ["label: 'Last 30 days'", "label: 'Son 30 gün'"],
  ['<div className="text-right">Count</div>', '<div className="text-right">Sayı</div>'],
  ['opacity-70">From</div>', 'opacity-70">Başlangıç</div>'],
  ['opacity-70">To</div>', 'opacity-70">Bitiş</div>'],
  ["'Total unknown errors' : 'Total errors'", "'Toplam bilinmeyen hata' : 'Toplam hata'"],
  ["? 'Unknown errors per social'", "? 'Platforma göre bilinmeyen hata'"],
  [": 'Errors per social'", ": 'Platforma göre hata'"],
  // Sayfa dili: büyük harfe çevrilen başlıklarda Türkçe i/İ doğru çıksın
  ['    <html>', '    <html lang="tr">'],
  // Giriş yapan kullanıcı takvime değil ana sayfaya düşer
  ["!!process.env.IS_GENERAL ? '/launches' : `/analytics`", "!!process.env.IS_GENERAL ? '/home' : `/analytics`"],
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
  // Yönetim sayfaları (istatistik, hatalar)
  'Error Details': 'Hata ayrıntıları',
  'Copy Debug Code': 'Hata ayıklama kodunu kopyala',
  'Post ID': 'Gönderi kimliği',
  'You do not have access to this page.': 'Bu sayfaya erişiminiz yok.',
  'All platforms': 'Bütün platformlar',
  'Email contains': 'E-posta içerir',
  'Unknown Error first': 'Önce bilinmeyen hatalar',
  'Per page': 'Sayfa başına',
  'Clear filters': 'Süzgeçleri temizle',
  'Failed to load errors.': 'Hatalar yüklenemedi.',
  'No errors found.': 'Hata bulunamadı.',
  'No data for this timeframe.': 'Bu dönem için veri yok.',
  'Admin Stats': 'Yönetim: İstatistikler',
  'Unknown errors only': 'Yalnızca bilinmeyen hatalar',
  'Failed to load stats.': 'İstatistikler yüklenemedi.',
  'Total posts published': 'Yayımlanan toplam gönderi',
  'Total connected accounts': 'Bağlı toplam hesap',
  'Posts published per social': 'Platforma göre yayımlanan gönderi',
  'Connected accounts per social': 'Platforma göre bağlı hesap',
  'Unique channels - published': 'Yayın yapan tekil kanallar',
  'Unique channels - scheduled': 'Zamanlaması olan tekil kanallar',
  'Unique users - published': 'Yayın yapan tekil kullanıcılar',
  'Unique users - scheduled': 'Zamanlaması olan tekil kullanıcılar',
  'Active users per source': 'Kaynağa göre etkin kullanıcı',
  'Connected clients per name': 'Ada göre bağlı istemci',
  'Unique channels - published (all platforms combined)': 'Yayın yapan tekil kanal (bütün platformlar)',
  'Unique channels - scheduled (all platforms combined)': 'Zamanlaması olan tekil kanal (bütün platformlar)',
  'Unique users - published (all platforms combined)': 'Yayın yapan tekil kullanıcı (bütün platformlar)',
  'Unique users - scheduled (all platforms combined)': 'Zamanlaması olan tekil kullanıcı (bütün platformlar)',
  'Unique users - active (all sources combined)': 'Etkin tekil kullanıcı (bütün kaynaklar)',
  'Connected clients (all clients combined)': 'Bağlı istemci (bütün istemciler)',
};

// Çeviri sistemine bağlanmamış uyarı ve onay mesajları (tek tırnaklı sabit metin).
const messages = {
  'Please reconnect the channel from the calendar': 'Lütfen kanalı takvimden yeniden bağlayın',
  'Please refresh the integration from the calendar': 'Lütfen kanalı takvimden yeniden bağlayın',
  'Video generation failed or timed out — if it completes, it will appear in your media library':
    'Video üretilemedi ya da süre doldu; tamamlanırsa medya kütüphanenizde görünür',
  'Invite link copied to clipboard, link will be available for 1 hour':
    'Davet bağlantısı panoya kopyalandı; bağlantı 1 saat geçerlidir',
  'Debug code copied to clipboard': 'Hata ayıklama kodu panoya kopyalandı',
  'App created! Copy your client secret now - it will only be shown once.':
    'Uygulama oluşturuldu. Gizli anahtarı şimdi kopyalayın; yalnızca bir kez gösterilir.',
  'Secret rotated! Copy your new client secret now.':
    'Gizli anahtar yenilendi. Yeni anahtarı şimdi kopyalayın.',
  'Name and Redirect URL are required': 'Ad ve yönlendirme adresi zorunludur',
  'Failed to create app': 'Uygulama oluşturulamadı',
  'App updated': 'Uygulama güncellendi',
  'Failed to update app': 'Uygulama güncellenemedi',
  'Failed to rotate secret': 'Gizli anahtar yenilenemedi',
  'Failed to delete app': 'Uygulama silinemedi',
  'Please enter an agent name': 'Lütfen bir ajan adı girin',
  'Claim URL copied to clipboard': 'Bağlantı panoya kopyalandı',
  'Are you sure? it will delete the current text': 'Emin misiniz? Mevcut metin silinecek',
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
// Kanal listesi olan sayfalar: kanallar müşteriye göre ayrılır (CustomerGroup)
const channelLists = [
  'components/platform-analytics/platform.analytics.tsx',
  'components/agents/agent.tsx',
  'components/plugs/plugs.tsx',
];
const customerGroupImport =
  "import { CustomerGroup } from '@gitroom/frontend/components/launches/customer.group';";

const patches = [
  // Kanal listeleri: önce müşteri adına göre sırala
  [
    /(\r?\n)(\s*)\['type', 'disabled', 'identifier'\],\r?\n\s*\['desc', 'asc', 'asc'\]/,
    "$1$2[\n$2  (o: any) => o?.customer?.name || '',\n$2  (o: any) => o?.customer?.id || '',\n$2  'type',\n$2  'disabled',\n$2  'identifier',\n$2],\n$2['asc', 'asc', 'desc', 'asc', 'asc']",
    channelLists,
  ],
  // Davet bağlantısı: müşteriye sosyal ağın izin ekranı yerine, neye onay verildiğini
  // anlatan sayfanın bağlantısı gider (bağlantıyla bağlanamayan türlerde eski yol)
  [
    /(\.join\('&'\);)(\r?\n)(\s*)(const response = await fetch\(\r?\n\s*`\/integrations\/social\/)/,
    "$1$2$3if (invite) {\n$3  const link = await createInviteLink(fetch, identifier);\n$3  if (link) {\n$3    toaster.show(\n$3      'Davet bağlantısı panoya kopyalandı; bağlantı 1 saat geçerlidir',\n$3      'success'\n$3    );\n$3    modal.closeAll();\n$3    copy(link);\n$3    return;\n$3  }\n$3}\n$3$4",
    ['components/launches/add.provider.component.tsx'],
  ],
  [
    /(import copy from 'copy-to-clipboard';\r?\n)(?!import \{ createInviteLink)/,
    "$1import { createInviteLink } from '@gitroom/frontend/components/launches/invite.link';\n",
    ['components/launches/add.provider.component.tsx'],
  ],
  // Kanal listeleri: seçili olmayan kanal adı okunabilsin (%20 yerine %50 soluk)
  [/opacity-20/g, 'opacity-50', channelLists],
  // Kanal listeleri: her satır CustomerGroup içine alınır (müşteri başlığı)
  [
    /(\{sortedIntegrations\.map\(\(integration, index\) => \(\r?\n)(\s*)<div(\r?\n)/,
    '$1$2<CustomerGroup\n$2  key={integration.id}\n$2  integrations={sortedIntegrations}\n$2  index={index}\n$2>\n$2<div$3',
    channelLists,
  ],
  [
    /(\{integration\.name\}\r?\n\s*<\/div>\r?\n\s*<\/div>\r?\n)(\s*)(\)\)\})/,
    '$1$2  </CustomerGroup>\n$2$3',
    channelLists,
  ],
  [
    /^('use client';\r?\n\r?\n)(?![\s\S]*components\/launches\/customer\.group)/,
    '$1' + customerGroupImport + '\n',
    channelLists,
  ],
  [
    /(      t\('connect_channels', 'Connect Channels'\),\r?\n)      t\('connect_agents', 'Connect Agents'\),\r?\n      t\('watch_tutorial', 'Watch Tutorial'\),\r?\n/,
    '$1',
  ],
  [
    /onNext=\{\(\) => setStep\(2\)\}(\r?\n\s*)onSkip=\{\(\) => setStep\(2\)\}/,
    'onNext={onClose}$1onSkip={onClose}',
  ],
  // Takvim varsayılan olarak ay görünümünde açılır (ajans işi aylık planlanır)
  [/\? 'day'(\r?\n\s*): 'week'(\r?\n\s*\);)/, "? 'day'$1: 'month'$2"],
  // Yönetim istatistiklerindeki "Apply" düğmesi
  [/(\n\s*)Apply(\r?\n\s*<\/Button>)/, '$1Uygula$2'],
  // Menünün başına Ana Sayfa (yalnızca henüz eklenmediyse eşleşir)
  [
    /(  const firstMenu = \[\r?\n)(    \{\r?\n      name: isGeneral \? t\('calendar', 'Calendar'\))/,
    '$1    {\n      name: t(\'home_menu\', \'Home\'),\n      icon: (\n        <svg\n          xmlns="http://www.w3.org/2000/svg"\n          width="21"\n          height="21"\n          viewBox="0 0 24 24"\n          fill="none"\n        >\n          <path\n            d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15V15H9v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"\n            stroke="currentColor"\n            strokeWidth="1.8"\n            strokeLinecap="round"\n            strokeLinejoin="round"\n          />\n        </svg>\n      ),\n      path: \'/home\',\n    },\n$2',
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
      const relative = file.slice(src.length + 1).replace(/\\/g, '/');
      for (const [from, to, only] of patches) {
        if (only && !only.includes(relative)) continue;
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
