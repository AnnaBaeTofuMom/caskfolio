import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PortfolioService } from './portfolio.service.js';

@Controller('portfolio/me')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  summary(@Headers('x-user-email') userEmail = 'demo@caskfolio.com') {
    return this.portfolioService.summary(userEmail);
  }

  @Get('chart')
  chart(@Headers('x-user-email') userEmail = 'demo@caskfolio.com') {
    return this.portfolioService.chart(userEmail);
  }

  @Post('share-link')
  createShareLink(
    @Headers('x-user-email') userEmail = 'demo@caskfolio.com',
    @Body() body: { selectedAssetIds?: string[] }
  ) {
    return this.portfolioService.createShareLink(userEmail, body.selectedAssetIds ?? []);
  }

  @Get('/share/:slug')
  sharedPortfolio(@Param('slug') slug: string) {
    return this.portfolioService.sharedPortfolio(slug);
  }
}
