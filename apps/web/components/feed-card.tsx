'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FeedCard } from '@caskfolio/types';

export function FeedCardItem({ card }: { card: FeedCard }) {
  const [isFollowing, setIsFollowing] = useState(Boolean(card.isFollowing));
  const [pending, setPending] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
  const canFollow = !card.isOwnAsset && !isFollowing;

  async function followOwner() {
    const userEmail = typeof window === 'undefined' ? null : window.localStorage.getItem('caskfolio_user_email');
    if (!userEmail || !canFollow || pending) return;

    setPending(true);
    try {
      const response = await fetch(`${API_BASE}/social/follow/${card.owner.id}`, {
        method: 'POST',
        headers: { 'x-user-email': userEmail }
      });
      if (response.ok) {
        setIsFollowing(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="card feed-card">
      <div className="feed-grid">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="feed-image feed-image-side" src={card.imageUrl} alt={card.title} />
        ) : (
          <div className="feed-image feed-image-side feed-image-placeholder">
            <span>{card.title}</span>
          </div>
        )}
        <div className="feed-content">
          <div className="meta">
            <div>
              <Link href={`/u/${card.owner.username}`}>
                <strong>@{card.owner.username}</strong>
              </Link>
              {card.productLine ? <p className="sub">{card.productLine}</p> : null}
            </div>
            <span>{formatDate(card.createdAt)}</span>
          </div>
          <h3>{card.title}</h3>
          {card.caption ? <p>{card.caption}</p> : null}

          <div className="feed-badges">
            {card.hasBox ? <span className="badge">Boxed</span> : null}
            {!card.isOwnAsset ? (
              <button className="btn ghost" type="button" disabled={!canFollow || pending} onClick={() => void followOwner()}>
                {isFollowing ? '팔로잉 중' : pending ? '팔로우 중...' : '팔로우'}
              </button>
            ) : null}
          </div>

          <div className="feed-metrics">
            <article className="metric">
              <p>Current Value</p>
              <strong>{card.currentValue ? `${formatNumber(card.currentValue)} KRW` : 'Hidden'}</strong>
            </article>
            <article className="metric">
              <p>Purchase Price</p>
              <strong>{card.purchasePrice ? `${formatNumber(card.purchasePrice)} KRW` : 'N/A'}</strong>
            </article>
            <article className="metric">
              <p>Performance</p>
              <strong>{formatPerformance(card.purchasePrice, card.currentValue)}</strong>
            </article>
          </div>

          <small>
            {card.priceMethod} · confidence {(card.confidence * 100).toFixed(0)}%
          </small>
        </div>
      </div>
    </article>
  );
}

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPerformance(purchasePrice?: number, currentValue?: number) {
  if (!purchasePrice || !currentValue || purchasePrice <= 0) return 'N/A';
  const pct = ((currentValue - purchasePrice) / purchasePrice) * 100;
  const prefix = pct > 0 ? '+' : '';
  return `${prefix}${pct.toFixed(1)}%`;
}
