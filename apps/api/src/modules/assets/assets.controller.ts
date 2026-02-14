import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AssetsService } from './assets.service.js';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  createAsset(@Headers('x-user-email') userEmail = 'demo@caskfolio.com', @Body() body: Record<string, unknown>) {
    return this.assetsService.createAsset(userEmail, body as never);
  }

  @Patch(':id')
  updateAsset(
    @Headers('x-user-email') userEmail = 'demo@caskfolio.com',
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.assetsService.updateAsset(userEmail, id, body as never);
  }

  @Get('me')
  myAssets(@Headers('x-user-email') userEmail = 'demo@caskfolio.com') {
    return this.assetsService.myAssets(userEmail);
  }
}
