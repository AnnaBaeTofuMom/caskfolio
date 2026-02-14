'use client';

import Link from 'next/link';
import { FeedPostForm } from '../../../components/feed-post-form';

export default function FeedNewPage() {
  return (
    <section className="feed-wrap">
      <Link className="sub" href="/feed">
        ← Back to Feed
      </Link>
      <h1>Create Feed Post</h1>
      <p className="sub">제목, 본문, 위젯(자산)을 선택해 포스트를 게시하세요.</p>
      <FeedPostForm />
    </section>
  );
}
