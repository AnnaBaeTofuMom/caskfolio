'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { FeedCard } from '@caskfolio/types';
import { FeedCardItem } from '../../components/feed-card';
import { readAuthContext } from '../../lib/auth-state';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api-proxy';

export default function FeedPage() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<FeedCard[]>([]);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prefetchedItems, setPrefetchedItems] = useState<FeedCard[] | null>(null);
  const [prefetchedNextCursor, setPrefetchedNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const prefetchingRef = useRef(false);

  useEffect(() => {
    const auth = readAuthContext(window.localStorage);
    setIsAuthenticated(Boolean(auth?.token));
    setAuthEmail(auth?.email ?? '');
    void loadFirstPage(auth?.email ?? undefined);
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isAuthenticated, nextCursor, prefetchedItems, loadingMore, hasMore]);

  async function loadFeedPage(email?: string, cursor?: string) {
    const query = new URLSearchParams({ limit: '20' });
    if (cursor) query.set('cursor', cursor);
    const headers: Record<string, string> = {};
    if (email) headers['x-user-email'] = email;
    const response = await fetch(`${API_BASE}/social/feed?${query.toString()}`, {
      headers
    });
    if (!response.ok) throw new Error('feed request failed');
    return (await response.json()) as { items?: FeedCard[]; nextCursor?: string | null };
  }

  async function prefetchNext(email: string | undefined, cursor: string | null) {
    if (!cursor || prefetchingRef.current) return;
    prefetchingRef.current = true;
    try {
      const data = await loadFeedPage(email, cursor);
      setPrefetchedItems(data.items ?? []);
      setPrefetchedNextCursor(data.nextCursor ?? null);
    } catch {
      setPrefetchedItems(null);
      setPrefetchedNextCursor(null);
    } finally {
      prefetchingRef.current = false;
    }
  }

  async function loadFirstPage(email?: string) {
    setLoading(true);
    setError('');
    setPrefetchedItems(null);
    setPrefetchedNextCursor(null);
    try {
      const data = await loadFeedPage(email);
      const firstItems = data.items ?? [];
      setItems(firstItems);
      const cursor = data.nextCursor ?? null;
      setNextCursor(cursor);
      setHasMore(Boolean(cursor));
      if (cursor) void prefetchNext(email, cursor);
    } catch {
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
      setError('피드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      if (prefetchedItems) {
        setItems((prev) => mergeUniqueFeedItems(prev, prefetchedItems));
        setNextCursor(prefetchedNextCursor);
        setHasMore(Boolean(prefetchedNextCursor));
        const next = prefetchedNextCursor;
        setPrefetchedItems(null);
        setPrefetchedNextCursor(null);
        if (next) void prefetchNext(authEmail || undefined, next);
        return;
      }

      if (!nextCursor) {
        setHasMore(false);
        return;
      }

      const data = await loadFeedPage(authEmail || undefined, nextCursor);
      const incoming = data.items ?? [];
      setItems((prev) => mergeUniqueFeedItems(prev, incoming));
      const cursor = data.nextCursor ?? null;
      setNextCursor(cursor);
      setHasMore(Boolean(cursor));
      if (cursor) void prefetchNext(authEmail || undefined, cursor);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="feed-wrap">
      <h1>Community Feed</h1>
      <p className="sub">Explore collections from fellow whisky enthusiasts</p>
      {isAuthenticated ? (
        <article className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Write a Post</h3>
          <p className="sub">Share a new bottle with your followers.</p>
          <Link href={'/feed/new' as Route} className="btn primary">
            Create Feed Post
          </Link>
        </article>
      ) : null}
      <div className="feed-list">
        {loading ? <p className="sub">Loading feed...</p> : null}
        {!loading && error ? <p className="sub">{error}</p> : null}
        {!loading && !items.length ? <p className="sub">No feed items yet.</p> : null}
        {!loading
          ? items.map((item) => <FeedCardItem key={item.assetId} card={item} />)
          : null}
        {!loading && hasMore ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
        {loadingMore ? <p className="sub">Loading more...</p> : null}
      </div>
    </section>
  );
}

function mergeUniqueFeedItems(previous: FeedCard[], incoming: FeedCard[]) {
  const seen = new Set(previous.map((item) => item.assetId));
  const appended = incoming.filter((item) => !seen.has(item.assetId));
  return [...previous, ...appended];
}
