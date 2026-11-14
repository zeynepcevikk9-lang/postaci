// Postacı: Postiz'in İngilizce ürettiği bildirim ve e-posta metinlerinin Türkçesi.
// Metinlerin bir kısmı zamanlayıcının iş akışı dosyalarında durur ve o dosyalar
// değiştirilemez (çalışan iş akışlarını bozar); bu yüzden çeviri, metin bildirim
// ve e-posta servisinden geçerken yapılır. Tanınmayan metin olduğu gibi kalır.
const rules: Array<[RegExp, string]> = [
  // --- gönderi yayını -------------------------------------------------------
  [
    /^We couldn't post to (.+?) for (.+?) because you need to reconnect it\. Please enable it and try again\.$/s,
    '$2 ($1) kanalında paylaşım yapılamadı çünkü kanalın yeniden bağlanması gerekiyor. Lütfen kanalı yeniden bağlayıp tekrar deneyin.',
  ],
  [
    /^We couldn't post to (.+?) for (.+?) because it's disabled\. Please enable it and try again\.$/s,
    '$2 ($1) kanalında paylaşım yapılamadı çünkü kanal devre dışı. Lütfen kanalı etkinleştirip tekrar deneyin.',
  ],
  [/^We couldn't post to (.+?) for (.+)$/s, '$2 ($1) kanalında paylaşım yapılamadı'],
  [/^We couldn't confirm your post on (.+)$/s, '$1 gönderiniz doğrulanamadı'],
  [
    /^Your post was sent to (.+?), but we couldn't confirm it was published\. Please check your (.+?) account before posting again to avoid duplicates\.$/s,
    'Gönderiniz $1 platformuna iletildi ama yayımlandığını doğrulayamadık. Aynı gönderiyi iki kez paylaşmamak için yeniden denemeden önce $2 hesabınızı kontrol edin.',
  ],
  [
    /^Error posting comments on (.+?) for (.+)$/s,
    '$2 ($1) kanalında yorumlar paylaşılırken hata oluştu',
  ],
  [/^Error posting on (.+?) for (.+)$/s, '$2 ($1) kanalında paylaşım hatası'],
  [
    /^An error occurred while posting comments on (.+?)(: [\s\S]+)?$/,
    '$1 üzerinde yorumlar paylaşılırken bir hata oluştu$2',
  ],
  [
    /^An error occurred while posting on (.+?)(: [\s\S]+)?$/,
    '$1 üzerinde paylaşım yapılırken bir hata oluştu$2',
  ],
  [
    /^Your post has been published on (\S+) at (.+)$/s,
    'Gönderiniz $1 üzerinde yayımlandı: $2',
  ],
  [/^Your post has been published on (.+)$/s, 'Gönderiniz $1 üzerinde yayımlandı'],
  // --- kanal bağlantısı -----------------------------------------------------
  [
    /^Could not refresh your (\S+) channel (.*)\. Please go back to the system and connect it again (.+)$/s,
    '$1 kanalınızın bağlantısı yenilenemedi $2. Lütfen panele dönüp kanalı yeniden bağlayın: $3',
  ],
  [/^Could not refresh your (\S+) channel$/, '$1 kanalınızın bağlantısı yenilenemedi'],
  // --- hesap e-postaları ----------------------------------------------------
  [/^Activate your account$/, 'Hesabınızı etkinleştirin'],
  [
    /^Click <a href="([^"]+)">here<\/a> to activate your account$/,
    'Hesabınızı etkinleştirmek için <a href="$1">buraya tıklayın</a>.',
  ],
  [/^Reset your password$/, 'Şifrenizi sıfırlayın'],
  [
    /^You have requested to reset your password\. <br \/>Click <a href="([^"]+)">here<\/a> to reset your password<br \/>The link will expire in 20 minutes$/,
    'Şifrenizi sıfırlamak istediniz.<br />Yeni şifre belirlemek için <a href="$1">buraya tıklayın</a>.<br />Bağlantı 20 dakika geçerlidir.',
  ],
  [/^(.+) invited you to join "(.+)"$/, '$1 sizi "$2" ekibine davet etti'],
  [
    /^(.+) has invited you to join the "(.+)" team\.<br \/><a href="([^"]+)">Accept the invitation<\/a> to get started\.<br \/>The link will expire in 2 days\.$/,
    '$1 sizi "$2" ekibine davet etti.<br />Başlamak için <a href="$3">daveti kabul edin</a>.<br />Bağlantı 2 gün geçerlidir.',
  ],
  // --- özet ve seri hatırlatmaları ------------------------------------------
  [/^\[Postiz\] Your latest notifications$/, 'Postacı: son bildirimleriniz'],
  [/^Streak Reminder$/, 'Paylaşım seriniz bitmek üzere'],
  [
    /^<p>You are about to lose your streak in two hours! schedule a post now to keep it!<\/p>$/,
    '<p>Paylaşım seriniz iki saat içinde bitecek. Seriyi sürdürmek için şimdi bir gönderi zamanlayın.</p>',
  ],
  [/^Streak Ended$/, 'Paylaşım seriniz bitti'],
  [
    /^<p>Your streak has ended! You didn't post anything in the last 24 hours\. Schedule a post now to start a new streak!<\/p>$/,
    '<p>Paylaşım seriniz bitti: son 24 saatte hiçbir şey paylaşılmadı. Yeni bir seri başlatmak için bir gönderi zamanlayın.</p>',
  ],
];

export const toTurkish = (text: string) => {
  if (typeof text !== 'string') {
    return text;
  }
  for (const [pattern, replacement] of rules) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }
  return text;
};
