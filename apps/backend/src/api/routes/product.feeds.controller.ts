import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ProductFeedService } from '@gitroom/nestjs-libraries/database/prisma/feeds/product.feed.service';
import { CreateProductFeedDto } from '@gitroom/nestjs-libraries/dtos/feeds/product.feed.dto';

// Postacı: e-ticaret bağlantısı. Mağazanın ürün XML'i eklenir; mağazaya sonradan
// giren ürünler taslak gönderi önerisi olarak listelenir.
@ApiTags('Product feeds')
@Controller('/product-feeds')
export class ProductFeedsController {
  constructor(private _feedService: ProductFeedService) {}

  @Get('/')
  listFeeds(@GetOrgFromRequest() org: Organization) {
    return this._feedService.listFeeds(org.id);
  }

  @Post('/')
  createFeed(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateProductFeedDto
  ) {
    return this._feedService.createFeed(org.id, body);
  }

  @Get('/new-items')
  listNewItems(@GetOrgFromRequest() org: Organization) {
    return this._feedService.listNewItems(org.id);
  }

  @Post('/items/:id/dismiss')
  dismissItem(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._feedService.dismissItem(org.id, id);
  }

  @Post('/items/:id/image')
  importItemImage(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._feedService.importItemImage(org.id, id);
  }

  @Post('/:id/sync')
  syncFeed(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._feedService.syncFeed(org.id, id);
  }

  @Delete('/:id')
  deleteFeed(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._feedService.deleteFeed(org.id, id);
  }
}
