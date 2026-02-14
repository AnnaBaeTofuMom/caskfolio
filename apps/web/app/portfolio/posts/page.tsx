'use client';

import Link from 'next/link';
import { MyAssetsPanel } from '../../../components/assets/my-assets-panel';

export default function PortfolioPostsPage() {
  return (
    <section className="portfolio-wrap">
      <div className="portfolio-head">
        <div>
          <h1>My Posts</h1>
          <p className="sub">All posts you shared on the community feed</p>
        </div>
        <Link className="btn ghost" href="/portfolio">
          Back to Portfolio
        </Link>
      </div>
      <MyAssetsPanel showAssets={false} showPosts postsPreviewCount={0} showShareActions={false} />
    </section>
  );
}
