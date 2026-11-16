import {
  Controller,
  HttpException,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ThrottlerRealIpGuard } from '@gitroom/nestjs-libraries/throttler/throttler.provider';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';

@ApiTags('Payment')
@Controller('/payment')
@UseGuards(ThrottlerRealIpGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } })
export class PaymentController {
  constructor(private readonly _paymentService: PaymentService) {}

  @Post('/:provider')
  async webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    try {
      return await this._paymentService.webhook(
        provider,
        req.rawBody,
        // @ts-ignore
        req.headers
      );
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(e, 500);
    }
  }
}
