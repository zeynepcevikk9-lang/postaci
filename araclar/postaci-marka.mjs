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
  }
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

console.log(`Değişen dosya: ${changed} | renk: ${colorHits} | metin: ${textHits}`);
