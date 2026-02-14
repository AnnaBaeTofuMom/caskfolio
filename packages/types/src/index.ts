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
  imageUrls?: string[];
  title: string;
  productLine?: string;
  hasBox?: boolean;
  purchasePrice?: number;
  currentValue?: number;
  caption?: string;
  trustedPrice?: number;
  priceMethod: 'WEIGHTED_MEDIAN' | 'EXTERNAL_MEDIAN' | 'INTERNAL_MEDIAN' | 'HIDDEN';
  confidence: number;
  isFollowing?: boolean;
  isOwnAsset?: boolean;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
      name: string;
      profileImage?: string;
    };
    replies?: Array<{
      id: string;
      content: string;
      createdAt: string;
      user: {
        id: string;
        username: string;
        name: string;
        profileImage?: string;
      };
    }>;
  }>;
  poll?: {
    question: string;
    options: string[];
    voteCounts: number[];
    totalVotes: number;
    votedOptionIndex?: number;
  };
}

export interface PortfolioSummary {
  totalEstimatedValue: number;
  totalPurchaseValue: number;
  unrealizedPnL: number;
  assetCount: number;
}
