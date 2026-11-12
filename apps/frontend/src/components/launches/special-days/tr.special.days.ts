// Postacı: Türkiye özel gün takvimi.
//
// Sabit günler her yıl aynı tarihtedir. Anneler Günü, Babalar Günü ve indirim
// günleri hesaplanır. Dini günler hicri takvime bağlı olduğu için yıl yıl elle
// girilir: aşağıdaki tarihler Diyanet İşleri Başkanlığı'nın dini günler takvimine
// dayanır (12 Kasım 2026'da haber kaynaklarından doğrulandı). Yeni yıl için
// `religiousDays` tablosuna satır eklenmesi yeterlidir; tablosu olmayan yılda dini
// günler gösterilmez.

export type SpecialDayKind = 'resmi' | 'dini' | 'ozel' | 'ticari';

export interface SpecialDay {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  kind: SpecialDayKind;
  /** Taslak gönderi için başlangıç metni; ajans markaya göre düzenler. */
  draft: string;
}

type DayTemplate = Omit<SpecialDay, 'date'>;

const fixedDays: Record<string, DayTemplate> = {
  '01-01': {
    name: 'Yılbaşı',
    kind: 'ozel',
    draft:
      'Yeni yılınız kutlu olsun! Sağlık, mutluluk ve güzel haberlerle dolu bir yıl dileriz. 🎉',
  },
  '02-14': {
    name: 'Sevgililer Günü',
    kind: 'ozel',
    draft: 'Sevginin en güzel hâli paylaşmak. Sevgililer Günü kutlu olsun! ❤️',
  },
  '03-08': {
    name: 'Dünya Kadınlar Günü',
    kind: 'ozel',
    draft:
      'Emeğiyle, cesaretiyle ve varlığıyla hayatı güzelleştiren bütün kadınların 8 Mart Dünya Kadınlar Günü kutlu olsun.',
  },
  '03-14': {
    name: 'Tıp Bayramı',
    kind: 'ozel',
    draft:
      'Sağlığımız için gece gündüz çalışan bütün sağlık emekçilerinin 14 Mart Tıp Bayramı kutlu olsun.',
  },
  '03-18': {
    name: 'Çanakkale Zaferi ve Şehitleri Anma Günü',
    kind: 'resmi',
    draft:
      '18 Mart Çanakkale Zaferi’nin yıl dönümünde, başta Gazi Mustafa Kemal Atatürk olmak üzere bütün şehitlerimizi saygı ve minnetle anıyoruz.',
  },
  '04-23': {
    name: 'Ulusal Egemenlik ve Çocuk Bayramı',
    kind: 'resmi',
    draft:
      '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun! Geleceğimiz olan bütün çocuklara sevgiyle. 🎈',
  },
  '05-01': {
    name: 'Emek ve Dayanışma Günü',
    kind: 'resmi',
    draft: '1 Mayıs Emek ve Dayanışma Günü kutlu olsun.',
  },
  '05-19': {
    name: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı',
    kind: 'resmi',
    draft:
      '19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı kutlu olsun! 🇹🇷',
  },
  '06-05': {
    name: 'Dünya Çevre Günü',
    kind: 'ozel',
    draft:
      'Tek bir dünyamız var. 5 Haziran Dünya Çevre Günü’nde doğaya iyi bakmak için küçük bir adım atalım. 🌍',
  },
  '07-15': {
    name: 'Demokrasi ve Millî Birlik Günü',
    kind: 'resmi',
    draft:
      '15 Temmuz Demokrasi ve Millî Birlik Günü’nde şehitlerimizi rahmetle, gazilerimizi minnetle anıyoruz.',
  },
  '08-30': {
    name: 'Zafer Bayramı',
    kind: 'resmi',
    draft: '30 Ağustos Zafer Bayramı kutlu olsun! 🇹🇷',
  },
  '10-04': {
    name: 'Hayvanları Koruma Günü',
    kind: 'ozel',
    draft:
      '4 Ekim Hayvanları Koruma Günü kutlu olsun. Bir kap su, bir kap mama: sokaktaki dostlarımızı unutmayalım. 🐾',
  },
  '10-29': {
    name: 'Cumhuriyet Bayramı',
    kind: 'resmi',
    draft: '29 Ekim Cumhuriyet Bayramı kutlu olsun! 🇹🇷',
  },
  '11-10': {
    name: 'Atatürk’ü Anma Günü',
    kind: 'resmi',
    draft:
      'Ulu Önder Mustafa Kemal Atatürk’ü saygı, özlem ve minnetle anıyoruz. 10 Kasım',
  },
  '11-11': {
    name: '11.11 İndirim Günü',
    kind: 'ticari',
    draft:
      '11.11 fırsatları başladı! Seçili ürünlerde [indirim oranı] indirim yalnızca bugün.',
  },
  '11-24': {
    name: 'Öğretmenler Günü',
    kind: 'ozel',
    draft:
      'Bize yol gösteren, emek veren bütün öğretmenlerimizin 24 Kasım Öğretmenler Günü kutlu olsun.',
  },
  '12-31': {
    name: 'Yılbaşı Gecesi',
    kind: 'ozel',
    draft:
      'Bir yılı daha birlikte geride bırakıyoruz. Yeni yılda da birlikte olmak dileğiyle, mutlu yıllar! ✨',
  },
};

// Dini günler: yıl -> { 'AA-GG': gün }. Bayramlarda ilk gün yazılır.
const religiousDays: Record<number, Record<string, DayTemplate>> = {
  2026: {
    '01-15': kandil('Miraç Kandili'),
    '02-02': kandil('Berat Kandili'),
    '03-16': kandil('Kadir Gecesi'),
    '05-26': arife('Kurban Bayramı'),
    '05-27': bayram('Kurban Bayramı'),
    '08-24': kandil('Mevlid Kandili'),
    '12-10': kandil('Regaip Kandili'),
  },
  2027: {
    '01-04': kandil('Miraç Kandili'),
    '01-22': kandil('Berat Kandili'),
    '02-08': {
      name: 'Ramazan Başlangıcı',
      kind: 'dini',
      draft:
        'On bir ayın sultanı Ramazan ayı hayırlı olsun. Sofralarınız bereketli, gönlünüz huzurlu olsun. 🌙',
    },
    '03-05': kandil('Kadir Gecesi'),
    '03-08': arife('Ramazan Bayramı'),
    '03-09': bayram('Ramazan Bayramı'),
    '05-15': arife('Kurban Bayramı'),
    '05-16': bayram('Kurban Bayramı'),
  },
};

function kandil(name: string): DayTemplate {
  return {
    name,
    kind: 'dini',
    draft: `${name} mübarek olsun. Dualarınızın kabul olmasını dileriz. 🌙`,
  };
}

function arife(bayramName: string): DayTemplate {
  return {
    name: `${bayramName} Arifesi`,
    kind: 'dini',
    draft: `Yarın bayram! ${bayramName} öncesinde çalışma saatlerimiz: [saatler].`,
  };
}

function bayram(name: string): DayTemplate {
  return {
    name,
    kind: 'dini',
    draft: `${name} mübarek olsun! Sevdiklerinizle birlikte sağlıklı ve huzurlu bir bayram dileriz.`,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

// Ayın n'inci haftanın günü (weekday: 0 pazar ... 6 cumartesi), 'AA-GG' döner.
function nthWeekday(year: number, month: number, weekday: number, n: number) {
  const first = new Date(year, month - 1, 1).getDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return `${pad(month)}-${pad(day)}`;
}

function computedDays(year: number): Record<string, DayTemplate> {
  // Efsane Cuma: kasım ayının dördüncü perşembesinden sonraki gün.
  const fourthThursday = Number(nthWeekday(year, 11, 4, 4).slice(3));
  const friday = new Date(year, 10, fourthThursday + 1);
  const monday = new Date(year, 10, fourthThursday + 4);
  const key = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    [nthWeekday(year, 5, 0, 2)]: {
      name: 'Anneler Günü',
      kind: 'ozel',
      draft:
        'Hayatımızın en güzel sığınağı annelerimizin Anneler Günü kutlu olsun. 💐',
    },
    [nthWeekday(year, 6, 0, 3)]: {
      name: 'Babalar Günü',
      kind: 'ozel',
      draft:
        'Her zaman yanımızda olan babalarımızın Babalar Günü kutlu olsun.',
    },
    [key(friday)]: {
      name: 'Efsane Cuma',
      kind: 'ticari',
      draft:
        'Efsane Cuma başladı! Bütün ürünlerde [indirim oranı] indirim, stoklarla sınırlı.',
    },
    [key(monday)]: {
      name: 'Siber Pazartesi',
      kind: 'ticari',
      draft:
        'Siber Pazartesi fırsatları: internet sitemize özel [indirim oranı] indirim bugün gece yarısına kadar.',
    },
  };
}

/** Bir yılın bütün özel günleri, tarihe göre sıralı. */
export function specialDaysOfYear(year: number): SpecialDay[] {
  const all = {
    ...fixedDays,
    ...computedDays(year),
    ...(religiousDays[year] || {}),
  };
  return Object.entries(all)
    .map(([monthDay, day]) => ({ date: `${year}-${monthDay}`, ...day }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** İki tarih arasındaki (uçlar dahil, YYYY-MM-DD) özel günler. */
export function specialDaysBetween(from: string, to: string): SpecialDay[] {
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  const days: SpecialDay[] = [];
  for (let year = startYear; year <= endYear; year++) {
    days.push(...specialDaysOfYear(year));
  }
  return days.filter((d) => d.date >= from && d.date <= to);
}
