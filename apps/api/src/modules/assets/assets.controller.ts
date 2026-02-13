import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Controller('assets')
export class AssetsController {
  private readonly assets: Record<string, unknown>[] = [];

  @Post()
  createAsset(@Body() body: Record<string, unknown>) {
    const asset = { id: randomUUID(), visibility: 'PRIVATE', ...body, createdAt: new Date().toISOString() };
    this.assets.push(asset);
    return asset;
  }

  @Patch(':id')
  updateAsset(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const idx = this.assets.findIndex((asset) => asset['id'] === id);
    if (idx < 0) return { error: 'asset not found' };
    this.assets[idx] = { ...this.assets[idx], ...body };
    return this.assets[idx];
  }

  @Get('me')
  myAssets() {
    return this.assets;
  }
}
