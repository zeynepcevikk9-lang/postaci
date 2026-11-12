// Postacı: yerel deneme için SAHTE iyzico sunucusu. Gerçek para ya da gerçek kart
// yoktur; yalnızca abonelik akışının bizim tarafını (ödeme formu, dönüş, webhook,
// iptal) iyzico hesabı olmadan denemek içindir. Yanıt biçimleri iyzico'nun
// belgelerindeki alan adlarına göre yazıldı; gerçek iyzico'nun yerini tutmaz,
// canlıya çıkmadan önce iyzico'nun deneme ortamıyla da denenmelidir.
//
// Çalıştırma:   node araclar/iyzico-sahte.mjs
// Arka uç .env: IYZICO_BASE_URL="http://localhost:4400"
//               IYZICO_API_KEY="sahte-api-key"   IYZICO_SECRET_KEY="sahte-secret-key"
//               IYZICO_PLAN_STANDARD_MONTHLY="SAHTE-STD-AY" (aşağıdaki plan kodları)
//
// Deneme yardımcıları (iyzico'da karşılığı yoktur):
//   POST /sahte/olay?ref=<abonelik kodu>&tur=success|failure
//        aboneliğin durumunu değiştirir ve arka uca webhook gönderir.
//   GET  /sahte/odeme?token=<form anahtarı>&sonuc=ok&donus=yok
//        ödemeyi tamamlar ama tarayıcıyı dönüş adresine göndermez (sekme kapandı denemesi).
//   GET  /sahte/durum   bütün sahte abonelikleri listeler.

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';

// Arka uçla aynı anahtarları kullanmak için: ortamda verilmemiş IYZICO_ ayarları
// depodaki .env dosyasından okunur.
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const [, key, value] of env.matchAll(/^(IYZICO_[A-Z_]+)="?([^"\r\n]*)"?/gm)) {
    process.env[key] ??= value;
  }
} catch (err) {
  // .env yoksa varsayılan deneme anahtarları kullanılır
}

const PORT = Number(process.env.IYZICO_SAHTE_PORT || 4400);
const API_KEY = process.env.IYZICO_API_KEY || 'sahte-api-key';
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || 'sahte-secret-key';
const MERCHANT_ID = process.env.IYZICO_MERCHANT_ID || '';
const WEBHOOK_URL =
  process.env.IYZICO_SAHTE_WEBHOOK_URL || 'http://localhost:3000/payment/iyzico';

const DAY = 24 * 60 * 60 * 1000;

// Örnek planlar. Fiyatlar yalnızca deneme içindir.
const plans = {
  'SAHTE-STD-AY': { name: 'Örnek Başlangıç', price: 100, interval: 'MONTHLY', trial: 7 },
  'SAHTE-STD-YIL': { name: 'Örnek Başlangıç', price: 1000, interval: 'YEARLY', trial: 7 },
  // Daha önce abone olmuş hesaplar için denemesiz eşler (IYZICO_PLAN_..._NO_TRIAL)
  'SAHTE-STD-AY-DENEMESIZ': { name: 'Örnek Başlangıç', price: 100, interval: 'MONTHLY', trial: 0 },
  'SAHTE-STD-YIL-DENEMESIZ': { name: 'Örnek Başlangıç', price: 1000, interval: 'YEARLY', trial: 0 },
  'SAHTE-EKIP-AY': { name: 'Örnek Ekip', price: 200, interval: 'MONTHLY', trial: 0 },
  'SAHTE-EKIP-YIL': { name: 'Örnek Ekip', price: 2000, interval: 'YEARLY', trial: 0 },
  'SAHTE-PRO-AY': { name: 'Örnek Pro', price: 300, interval: 'MONTHLY', trial: 0 },
  'SAHTE-PRO-YIL': { name: 'Örnek Pro', price: 3000, interval: 'YEARLY', trial: 0 },
};

const checkouts = new Map(); // token -> { planCode, callbackUrl, customer, subscription? }
const subscriptions = new Map(); // referenceCode -> abonelik

const periodLength = (interval) => (interval === 'YEARLY' ? 365 : 30) * DAY;

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const failure = (res, errorMessage) =>
  send(res, 200, { status: 'failure', errorMessage, systemTime: Date.now() });

// IYZWSv2: base64("apiKey:..&randomKey:..&signature:..") ve
// signature = HMAC-SHA256(randomKey + yol + gövde, secretKey)
function authorized(req, path, body) {
  const [scheme, encoded] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'IYZWSv2' || !encoded) {
    return false;
  }
  const fields = Object.fromEntries(
    Buffer.from(encoded, 'base64')
      .toString('utf8')
      .split('&')
      .map((part) => [part.slice(0, part.indexOf(':')), part.slice(part.indexOf(':') + 1)])
  );
  const expected = createHmac('sha256', SECRET_KEY)
    .update(fields.randomKey + path + body)
    .digest('hex');
  return fields.apiKey === API_KEY && fields.signature === expected;
}

function createSubscription(checkout) {
  const plan = plans[checkout.planCode];
  const now = Date.now();
  const subscription = {
    referenceCode: randomUUID(),
    parentReferenceCode: randomUUID(),
    pricingPlanName: plan.name,
    pricingPlanReferenceCode: checkout.planCode,
    customerEmail: checkout.customer?.email || '',
    customerReferenceCode: randomUUID(),
    subscriptionStatus: 'ACTIVE',
    trialDays: plan.trial,
    trialStartDate: plan.trial ? now : undefined,
    trialEndDate: plan.trial ? now + plan.trial * DAY : undefined,
    createdDate: now,
    startDate: now,
    orders: plan.trial
      ? []
      : [
          {
            referenceCode: randomUUID(),
            price: plan.price,
            currencyCode: 'TRY',
            startPeriod: now,
            endPeriod: now + periodLength(plan.interval),
            orderStatus: 'SUCCESS',
          },
        ],
  };
  subscriptions.set(subscription.referenceCode, subscription);
  return subscription;
}

async function sendWebhook(subscription, order, type) {
  const event = {
    orderReferenceCode: order.referenceCode,
    customerReferenceCode: subscription.customerReferenceCode,
    subscriptionReferenceCode: subscription.referenceCode,
    iyziReferenceCode: randomUUID(),
    iyziEventType: `subscription.order.${type}`,
    iyziEventTime: Date.now(),
  };
  const headers = { 'Content-Type': 'application/json' };
  if (MERCHANT_ID) {
    headers['X-IYZ-SIGNATURE-V3'] = createHmac('sha256', SECRET_KEY)
      .update(
        MERCHANT_ID +
          SECRET_KEY +
          event.iyziEventType +
          event.subscriptionReferenceCode +
          event.orderReferenceCode +
          event.customerReferenceCode
      )
      .digest('hex');
  }
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
  });
  return { status: response.status, body: await response.text() };
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    // --- deneme yardımcıları (kimlik denetimi yok, yalnızca yerel) ---------
    if (path === '/sahte/odeme') {
      const checkout = checkouts.get(url.searchParams.get('token'));
      if (!checkout) {
        return send(res, 404, 'Form bulunamadı', 'text/plain; charset=utf-8');
      }
      if (url.searchParams.get('sonuc') === 'ok' && !checkout.subscription) {
        checkout.subscription = createSubscription(checkout);
      }
      // donus=yok: ödeme yapıldı ama tarayıcı dönüş adresine gitmedi (sekme kapandı) denemesi
      if (url.searchParams.get('donus') === 'yok') {
        return send(res, 200, { odendi: !!checkout.subscription, ref: checkout.subscription?.referenceCode });
      }
      // iyzico gibi: tarayıcıyı form anahtarıyla dönüş adresine POST eder.
      return send(
        res,
        200,
        `<!doctype html><meta charset="utf-8"><body onload="document.forms[0].submit()">
<form method="post" action="${escapeHtml(checkout.callbackUrl)}">
<input type="hidden" name="token" value="${escapeHtml(url.searchParams.get('token'))}">
</form></body>`,
        'text/html; charset=utf-8'
      );
    }

    if (path === '/sahte/olay' && req.method === 'POST') {
      const subscription = subscriptions.get(url.searchParams.get('ref'));
      if (!subscription) {
        return send(res, 404, { hata: 'abonelik bulunamadı' });
      }
      const plan = plans[subscription.pricingPlanReferenceCode];
      const last = subscription.orders[subscription.orders.length - 1];
      const start = last?.endPeriod || subscription.trialEndDate || Date.now();
      const success = url.searchParams.get('tur') !== 'failure';
      const order = {
        referenceCode: randomUUID(),
        price: plan.price,
        currencyCode: 'TRY',
        startPeriod: start,
        endPeriod: start + periodLength(plan.interval),
        orderStatus: success ? 'SUCCESS' : 'FAILED',
      };
      subscription.orders.push(order);
      subscription.subscriptionStatus = success ? 'ACTIVE' : 'UNPAID';
      if (success) {
        subscription.trialEndDate = undefined;
      }
      return send(res, 200, {
        durum: subscription.subscriptionStatus,
        webhook: await sendWebhook(subscription, order, success ? 'success' : 'failure'),
      });
    }

    if (path === '/sahte/durum') {
      return send(res, 200, [...subscriptions.values()]);
    }

    // --- iyzico abonelik API'si ---------------------------------------------
    if (!authorized(req, path, body)) {
      return failure(res, 'Kimlik doğrulama başarısız (IYZWSv2 imzası uyuşmuyor)');
    }

    let match;
    if (req.method === 'GET' && (match = path.match(/^\/v2\/subscription\/pricing-plans\/([^/]+)$/))) {
      const code = decodeURIComponent(match[1]);
      const plan = plans[code];
      if (!plan) {
        return failure(res, 'Plan bulunamadı');
      }
      return send(res, 200, {
        status: 'success',
        systemTime: Date.now(),
        data: {
          referenceCode: code,
          name: plan.name,
          price: plan.price,
          currencyCode: 'TRY',
          paymentInterval: plan.interval,
          paymentIntervalCount: 1,
          planPaymentType: 'RECURRING',
          trialPeriodDays: plan.trial,
          status: 'ACTIVE',
        },
      });
    }

    if (req.method === 'POST' && path === '/v2/subscription/checkoutform/initialize') {
      const request = JSON.parse(body || '{}');
      const customer = request.customer || {};
      const missing = ['name', 'surname', 'email', 'gsmNumber', 'identityNumber', 'billingAddress'].filter(
        (key) => !customer[key]
      );
      if (!plans[request.pricingPlanReferenceCode]) {
        return failure(res, 'Plan bulunamadı');
      }
      if (!request.callbackUrl || missing.length) {
        return failure(res, `Eksik alan: ${['callbackUrl', ...missing].join(', ')}`);
      }
      const token = randomUUID();
      checkouts.set(token, {
        planCode: request.pricingPlanReferenceCode,
        callbackUrl: request.callbackUrl,
        customer,
      });
      const plan = plans[request.pricingPlanReferenceCode];
      const pay = `http://localhost:${PORT}/sahte/odeme?token=${token}`;
      return send(res, 200, {
        status: 'success',
        systemTime: Date.now(),
        token,
        tokenExpireTime: 1800,
        checkoutFormContent: `<script type="text/javascript">(function(){
var box=document.getElementById('iyzipay-checkout-form');
if(!box){return;}
box.innerHTML='<div style="border:2px dashed #ff6b4a;border-radius:10px;padding:16px;font:14px sans-serif">'
+'<b>SAHTE iyzico ödeme formu</b> (yerel deneme, gerçek ödeme yok)<br>'
+${JSON.stringify(escapeHtml(plan.name))}+' · ${plan.price} TL<br><br>'
+'<a id="sahte-ok" href="${pay}&sonuc=ok" style="margin-right:12px">Ödemeyi tamamla</a>'
+'<a id="sahte-red" href="${pay}&sonuc=red">Ödemeyi reddet</a></div>';
})();</script>`,
      });
    }

    if (req.method === 'GET' && (match = path.match(/^\/v2\/subscription\/checkoutform\/([^/]+)$/))) {
      const checkout = checkouts.get(decodeURIComponent(match[1]));
      if (!checkout?.subscription) {
        return failure(res, 'Ödeme tamamlanmadı');
      }
      const s = checkout.subscription;
      return send(res, 200, {
        status: 'success',
        systemTime: Date.now(),
        token: match[1],
        data: {
          referenceCode: s.referenceCode,
          parentReferenceCode: s.parentReferenceCode,
          customerReferenceCode: s.customerReferenceCode,
          pricingPlanReferenceCode: s.pricingPlanReferenceCode,
          subscriptionStatus: s.subscriptionStatus,
          trialDays: s.trialDays,
          trialStartDate: s.trialStartDate,
          trialEndDate: s.trialEndDate,
          createdDate: s.createdDate,
          startDate: s.startDate,
        },
      });
    }

    if ((match = path.match(/^\/v2\/subscription\/subscriptions\/([^/]+)(\/cancel)?$/))) {
      const subscription = subscriptions.get(decodeURIComponent(match[1]));
      if (!subscription) {
        return failure(res, 'Abonelik bulunamadı');
      }
      if (match[2] && req.method === 'POST') {
        if (subscription.subscriptionStatus === 'CANCELED') {
          return failure(res, 'Abonelik zaten iptal edilmiş');
        }
        subscription.subscriptionStatus = 'CANCELED';
        return send(res, 200, { status: 'success', systemTime: Date.now() });
      }
      if (!match[2] && req.method === 'GET') {
        return send(res, 200, {
          status: 'success',
          systemTime: Date.now(),
          data: { totalCount: 1, currentPage: 1, pageCount: 1, items: [subscription] },
        });
      }
    }

    return failure(res, `Sahte sunucuda karşılığı yok: ${req.method} ${path}`);
  })
  .listen(PORT, () => {
    console.log(`Sahte iyzico sunucusu http://localhost:${PORT} adresinde (gerçek ödeme yok)`);
  });
