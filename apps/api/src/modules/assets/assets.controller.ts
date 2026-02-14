import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { AssetsService } from './assets.service.js';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  createAsset(@Headers('x-user-email') userEmail: string | undefined, @Body() body: Record<string, unknown>) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.assetsService.createAsset(userEmail, body as never);
  }

  @Patch(':id')
  updateAsset(
    @Headers('x-user-email') userEmail: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.assetsService.updateAsset(userEmail, id, body as never);
  }

  @Get('me')
  myAssets(@Headers('x-user-email') userEmail: string | undefined) {
    if (!userEmail) throw new UnauthorizedException('Missing user context');
    return this.assetsService.myAssets(userEmail);
  }
}
