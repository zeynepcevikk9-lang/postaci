import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ProductFeedRepository } from '@gitroom/nestjs-libraries/database/prisma/feeds/product.feed.repository';
import { parseProductFeed } from '@gitroom/nestjs-libraries/database/prisma/feeds/product.feed.parser';
import { CreateProductFeedDto } from '@gitroom/nestjs-libraries/dtos/feeds/product.feed.dto';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';

const MAX_FEEDS = 20;
const MAX_FEED_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
// Liste istenirken bu süreden eski mağazalar yeniden okunur.
const AUTO_SYNC_AFTER_MS = 60 * 60 * 1000;
const AUTO_SYNC_PER_REQUEST = 3;
// Arka plan kontrolü: saatte bir, altı saattir okunmamış mağazalar yeniden okunur.
const BACKGROUND_EVERY_MS = 60 * 60 * 1000;
const BACKGROUND_STALE_MS = 6 * 60 * 60 * 1000;
const BACKGROUND_PER_RUN = 20;

let backgroundTimer: NodeJS.Timeout | null = null;

@Injectable()
export class ProductFeedService implements OnModuleInit {
  constructor(
    private _feedRepository: ProductFeedRepository,
    private _mediaService: MediaService,
    private _notificationService: NotificationService
  ) {}

  // Kullanıcı paneli açmasa da mağazalar kontrol edilir; yeni ürün gelince
  // hesaba bildirim düşer.
  onModuleInit() {
    if (backgroundTimer) {
      return;
    }
    this.checkStaleFeeds();
    backgroundTimer = setInterval(() => {
      this.checkStaleFeeds();
    }, BACKGROUND_EVERY_MS);
    backgroundTimer.unref();
  }

  async checkStaleFeeds() {
    try {
      const feeds = await this._feedRepository.getStaleFeeds(
        new Date(Date.now() - BACKGROUND_STALE_MS),
        BACKGROUND_PER_RUN
      );
      for (const feed of feeds) {
        try {
          if (
            !(await this._feedRepository.claimFeed(feed.id, feed.lastCheckedAt))
          ) {
            continue;
          }
          const { added } = await this.syncFeed(feed.organizationId, feed.id);
          if (added) {
            await this._notificationService.inAppNotification(
              feed.organizationId,
              `${feed.name}: ${added} yeni ürün`,
              `${feed.name} mağazasına ${added} yeni ürün eklendi. Takvimdeki "Mağaza" düğmesinden taslak gönderi oluşturabilirsiniz.`,
              true,
              true
            );
          }
        } catch (err) {
          // okunamayan mağaza diğerlerini engellemez; bir sonraki turda yeniden denenir
        }
      }
    } catch (err) {
      console.error('product feeds could not be checked', err);
    }
  }

  // Ürün görselini hesabın medya kütüphanesine alır; taslak gönderiye eklenir.
  // Görsel adresi mağazanın XML'inden gelir: yalnızca genel https adresi kabul
  // edilir ve indirme, iç ağ adreslerini engelleyen aracıyla yapılır.
  async importItemImage(organizationId: string, id: string) {
    const item = await this._feedRepository.getItem(organizationId, id);
    if (!item?.image) {
      throw new BadRequestException('Product has no image');
    }
    const ssrfDisabled = process.env.DISABLE_SSRF_PROTECTION === 'true';
    if (!ssrfDisabled && !(await isSafePublicHttpsUrl(item.image))) {
      throw new BadRequestException('Image must be a public https address');
    }

    const media = await this._mediaService.uploadFromUrl(
      organizationId,
      item.image
    );
    return { id: media.id, path: media.path };
  }

  // Adres dışarıdan gelir: yalnızca genel https adresleri okunur ve bağlantı,
  // iç ağ adreslerini engelleyen aracıyla kurulur (webhook'larla aynı kural).
  private async download(url: string) {
    const ssrfDisabled = process.env.DISABLE_SSRF_PROTECTION === 'true';
    if (!ssrfDisabled && !(await isSafePublicHttpsUrl(url))) {
      throw new BadRequestException('Feed URL must be a public https address');
    }

    let response: Response;
    try {
      response = await fetch(url, {
        // @ts-ignore undici seçeneği
        dispatcher: getSsrfSafeDispatcher(),
        // Yönlendirmeler izlenir; her bağlantı yine iç ağ denetiminden geçer.
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: 'application/xml, text/xml, */*' },
      });
    } catch (err) {
      throw new BadRequestException('Feed could not be downloaded');
    }
    if (!response.ok) {
      throw new BadRequestException('Feed could not be downloaded');
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_FEED_BYTES) {
      throw new BadRequestException('Feed is too large');
    }
    return new TextDecoder('utf-8').decode(buffer);
  }

  private async readProducts(url: string) {
    const xml = await this.download(url);
    try {
      return parseProductFeed(xml);
    } catch (err) {
      throw new BadRequestException('Feed is not a readable product XML');
    }
  }

  listFeeds(organizationId: string) {
    return this._feedRepository.listFeeds(organizationId);
  }

  async createFeed(organizationId: string, body: CreateProductFeedDto) {
    if ((await this._feedRepository.countFeeds(organizationId)) >= MAX_FEEDS) {
      throw new BadRequestException('Too many feeds');
    }
    if (
      body.customerId &&
      !(await this._feedRepository.getCustomer(organizationId, body.customerId))
    ) {
      throw new BadRequestException('Customer not found');
    }

    // Kaydetmeden önce okunur: bozuk ya da ürünsüz adres hiç eklenmez.
    const products = await this.readProducts(body.url);
    if (!products.length) {
      throw new BadRequestException('No products found in the feed');
    }

    const feed = await this._feedRepository.createFeed(
      organizationId,
      body.name.trim(),
      body.url,
      body.customerId
    );
    // İlk okumadaki ürünler "yeni" sayılmaz; yoksa bütün mağaza taslak önerisi olurdu.
    await this._feedRepository.addItems(organizationId, feed.id, products, false);
    await this._feedRepository.markChecked(feed.id);

    return { ...feed, products: products.length };
  }

  async deleteFeed(organizationId: string, id: string) {
    await this._feedRepository.deleteFeed(organizationId, id);
    return { success: true };
  }

  // Mağazayı yeniden okur; daha önce görülmemiş ürünler "yeni" olarak eklenir.
  async syncFeed(organizationId: string, id: string) {
    const feed = await this._feedRepository.getFeed(organizationId, id);
    if (!feed) {
      throw new BadRequestException('Feed not found');
    }

    const products = await this.readProducts(feed.url);
    const known = new Set(
      (await this._feedRepository.getKnownExternalIds(feed.id)).map(
        (item) => item.externalId
      )
    );
    const fresh = products.filter((p) => !known.has(p.externalId));
    if (fresh.length) {
      await this._feedRepository.addItems(organizationId, feed.id, fresh, true);
    }
    await this._feedRepository.markChecked(feed.id);

    return { added: fresh.length };
  }

  async listNewItems(organizationId: string) {
    const feeds = await this._feedRepository.listFeeds(organizationId);

    // Uzun süredir okunmayan mağazalar sırayla yenilenir; okunamayan mağaza
    // listeyi engellemez.
    const stale = feeds
      .filter(
        (feed) =>
          !feed.lastCheckedAt ||
          Date.now() - feed.lastCheckedAt.getTime() > AUTO_SYNC_AFTER_MS
      )
      .slice(0, AUTO_SYNC_PER_REQUEST);
    for (const feed of stale) {
      try {
        await this.syncFeed(organizationId, feed.id);
      } catch (err) {
        await this._feedRepository.markChecked(feed.id);
      }
    }

    const feedNames = new Map(feeds.map((feed) => [feed.id, feed.name]));
    const items = await this._feedRepository.listNewItems(organizationId);
    return items
      .filter((item) => feedNames.has(item.feedId))
      .map((item) => ({ ...item, feedName: feedNames.get(item.feedId) }));
  }

  async dismissItem(organizationId: string, id: string) {
    await this._feedRepository.dismissItem(organizationId, id);
    return { success: true };
  }
}
