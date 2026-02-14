export type Visibility = 'PRIVATE' | 'PUBLIC';

export interface FeedCard {
  assetId: string;
  owner: {
    id: string;
    username: string;
    name: string;
    profileImage?: string;
  };
  imageUrl?: string;
  title: string;
  caption?: string;
  trustedPrice?: number;
  priceMethod: 'WEIGHTED_MEDIAN' | 'EXTERNAL_MEDIAN' | 'INTERNAL_MEDIAN' | 'HIDDEN';
  confidence: number;
  isFollowing?: boolean;
  isOwnAsset?: boolean;
  createdAt: string;
}

export interface PortfolioSummary {
  totalEstimatedValue: number;
  totalPurchaseValue: number;
  unrealizedPnL: number;
  assetCount: number;
}
