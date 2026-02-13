import { Controller, Get, Param } from '@nestjs/common';

@Controller('u')
export class ProfileController {
  @Get(':username')
  publicProfile(@Param('username') username: string) {
    return {
      username,
      summary: { assetCount: 12, publicAssets: 8 },
      assets: [
        {
          assetId: 'asset-123',
          title: 'Yamazaki 18',
          imageUrl: null,
          visibility: 'PUBLIC'
        }
      ]
    };
  }
}
