import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { FeedProduct } from '@gitroom/nestjs-libraries/database/prisma/feeds/product.feed.parser';

const feedSelect = {
  id: true,
  name: true,
  url: true,
  customerId: true,
  lastCheckedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class ProductFeedRepository {
  constructor(
    private _feeds: PrismaRepository<'productFeed'>,
    private _items: PrismaRepository<'productFeedItem'>,
    private _customers: PrismaRepository<'customer'>
  ) {}

  getCustomer(organizationId: string, customerId: string) {
    return this._customers.model.customer.findFirst({
      where: { id: customerId, orgId: organizationId, deletedAt: null },
      select: { id: true },
    });
  }

  listFeeds(organizationId: string) {
    return this._feeds.model.productFeed.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: feedSelect,
    });
  }

  countFeeds(organizationId: string) {
    return this._feeds.model.productFeed.count({
      where: { organizationId, deletedAt: null },
    });
  }

  getFeed(organizationId: string, id: string) {
    return this._feeds.model.productFeed.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: feedSelect,
    });
  }

  createFeed(
    organizationId: string,
    name: string,
    url: string,
    customerId?: string
  ) {
    return this._feeds.model.productFeed.create({
      data: { organizationId, name, url, customerId },
      select: feedSelect,
    });
  }

  deleteFeed(organizationId: string, id: string) {
    return this._feeds.model.productFeed.updateMany({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });
  }

  // Uzun süredir okunmamış mağazalar (bütün hesaplar), en eskisi önce.
  getStaleFeeds(before: Date, take: number) {
    return this._feeds.model.productFeed.findMany({
      where: {
        deletedAt: null,
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: before } }],
      },
      orderBy: { lastCheckedAt: 'asc' },
      take,
      select: {
        id: true,
        organizationId: true,
        name: true,
        lastCheckedAt: true,
      },
    });
  }

  // Arka plan kontrolü birden çok süreçte çalışabilir; mağazayı ilk sahiplenen
  // okur (okuma zamanı yalnızca hâlâ eski değerdeyse güncellenir).
  async claimFeed(id: string, lastCheckedAt: Date | null) {
    const { count } = await this._feeds.model.productFeed.updateMany({
      where: { id, deletedAt: null, lastCheckedAt },
      data: { lastCheckedAt: new Date() },
    });
    return count === 1;
  }

  getItem(organizationId: string, id: string) {
    return this._items.model.productFeedItem.findFirst({
      where: { id, organizationId },
      select: { id: true, image: true },
    });
  }

  markChecked(id: string) {
    return this._feeds.model.productFeed.update({
      where: { id },
      data: { lastCheckedAt: new Date() },
      select: { id: true },
    });
  }

  getKnownExternalIds(feedId: string) {
    return this._items.model.productFeedItem.findMany({
      where: { feedId },
      select: { externalId: true },
    });
  }

  addItems(
    organizationId: string,
    feedId: string,
    products: FeedProduct[],
    isNew: boolean
  ) {
    return this._items.model.productFeedItem.createMany({
      data: products.map((product) => ({
        organizationId,
        feedId,
        isNew,
        ...product,
      })),
      skipDuplicates: true,
    });
  }

  // Mağazaya sonradan eklenen ve henüz taslağa dönüştürülmemiş ürünler.
  listNewItems(organizationId: string) {
    return this._items.model.productFeedItem.findMany({
      where: { organizationId, isNew: true, dismissedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        feedId: true,
        title: true,
        price: true,
        image: true,
        link: true,
        createdAt: true,
      },
    });
  }

  dismissItem(organizationId: string, id: string) {
    return this._items.model.productFeedItem.updateMany({
      where: { id, organizationId },
      data: { dismissedAt: new Date() },
    });
  }
}
