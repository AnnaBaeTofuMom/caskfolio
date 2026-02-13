import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service.js';
import { CrawlerController } from './crawler.controller.js';

@Module({ providers: [CrawlerService], controllers: [CrawlerController] })
export class CrawlerModule {}
