import { XMLParser } from 'fast-xml-parser';

// Postacı: ürün XML'ini ortak bir ürün listesine çevirir. Türkiye'deki e-ticaret
// platformları farklı etiket adları kullanır (Google Merchant: item/g:id/title;
// yerli biçimler: Urun/UrunAdi/SatisFiyati vb.). Biçimi adından tanımak yerine
// belgedeki en büyük ürün dizisi bulunur ve alanlar bilinen ad adaylarıyla eşlenir.

export interface FeedProduct {
  externalId: string;
  title: string;
  price: string | null;
  image: string | null;
  link: string | null;
}

const MAX_PRODUCTS = 2000;

const candidates = {
  id: ['id', 'urunkartiid', 'urunid', 'urun_id', 'productid', 'product_id', 'sku', 'stokkodu', 'stok_kodu', 'stockcode', 'code', 'barcode', 'barkod', 'guid'],
  title: ['title', 'name', 'urunadi', 'urun_adi', 'productname', 'product_name', 'baslik', 'label'],
  price: ['sale_price', 'saleprice', 'indirimlifiyat', 'indirimli_fiyat', 'satisfiyati', 'satis_fiyati', 'price', 'fiyat', 'price1', 'listprice'],
  image: ['image_link', 'imagelink', 'image', 'resim', 'picture', 'img', 'imageurl', 'image_url', 'resim1', 'images', 'resimler', 'pictures'],
  link: ['link', 'url', 'urunurl', 'urun_url', 'producturl', 'product_url'],
};

// Etiket adı karşılaştırması: küçük harf, Türkçe karakterler sadeleştirilmiş.
const normalize = (key: string) =>
  key
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

// Bir alanın değeri düz metin, { '#text': ... } ya da iç içe liste olabilir.
function text(value: unknown, depth = 0): string | null {
  if (value === null || value === undefined || depth > 4) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const s = String(value).trim();
    return s || null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = text(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('#text' in obj) {
      return text(obj['#text'], depth + 1);
    }
    if ('@_href' in obj) {
      return text(obj['@_href'], depth + 1);
    }
    for (const inner of Object.values(obj)) {
      const found = text(inner, depth + 1);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function pick(item: Record<string, unknown>, names: string[]) {
  const byName = new Map(
    Object.keys(item).map((key) => [normalize(key), key] as const)
  );
  for (const name of names) {
    const key = byName.get(name);
    if (key) {
      const found = text(item[key]);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// Belgedeki en büyük "nesne dizisi"ni bulur; ürün listesi odur.
function largestObjectArray(node: unknown, depth = 0): Record<string, unknown>[] {
  if (!node || typeof node !== 'object' || depth > 8) {
    return [];
  }
  let best: Record<string, unknown>[] = [];
  if (Array.isArray(node)) {
    const objects = node.filter(
      (n) => n && typeof n === 'object' && !Array.isArray(n)
    ) as Record<string, unknown>[];
    if (objects.length > best.length) {
      best = objects;
    }
    for (const child of node.slice(0, 50)) {
      const inner = largestObjectArray(child, depth + 1);
      if (inner.length > best.length) {
        best = inner;
      }
    }
    return best;
  }
  for (const child of Object.values(node as Record<string, unknown>)) {
    const inner = largestObjectArray(child, depth + 1);
    if (inner.length > best.length) {
      best = inner;
    }
  }
  return best;
}

const isHttpUrl = (value: string | null) =>
  !!value && /^https?:\/\/[^\s"'<>]+$/i.test(value);

export function parseProductFeed(xml: string): FeedProduct[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
    // Tek ürünlü belgede de dizi gelsin diye yaygın ürün etiketleri dizi sayılır.
    isArray: (name) =>
      ['item', 'entry', 'urun', 'product'].includes(normalize(name)),
  });

  const items = largestObjectArray(parser.parse(xml)).slice(0, MAX_PRODUCTS);
  const seen = new Set<string>();
  const products: FeedProduct[] = [];

  for (const item of items) {
    const title = pick(item, candidates.title);
    const link = pick(item, candidates.link);
    const externalId = pick(item, candidates.id) || link || title;
    if (!title || !externalId || seen.has(externalId)) {
      continue;
    }
    seen.add(externalId);
    const image = pick(item, candidates.image);
    products.push({
      externalId: externalId.slice(0, 300),
      title: title.slice(0, 300),
      price: pick(item, candidates.price)?.slice(0, 60) || null,
      image: isHttpUrl(image) ? image!.slice(0, 1000) : null,
      link: isHttpUrl(link) ? link!.slice(0, 1000) : null,
    });
  }

  return products;
}
