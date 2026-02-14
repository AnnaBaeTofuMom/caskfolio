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
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="feed-image" src={card.imageUrl} alt={card.title} />
      ) : (
        <div className="feed-image feed-image-placeholder">
          <span>{card.title}</span>
        </div>
      )}
      <div className="meta">
        <Link href={`/u/${card.owner.username}`}>
          <strong>@{card.owner.username}</strong>
        </Link>
        <span>{formatDate(card.createdAt)}</span>
      </div>
      <h3>{card.title}</h3>
      {card.caption ? <p>{card.caption}</p> : null}
      {!card.isOwnAsset ? (
        <button className="btn ghost" type="button" disabled={!canFollow || pending} onClick={() => void followOwner()}>
          {isFollowing ? '팔로잉 중' : pending ? '팔로우 중...' : '팔로우'}
        </button>
      ) : null}
      <div className="price-row">
        <span>Trusted Price</span>
        <strong>{card.trustedPrice ? `${formatNumber(card.trustedPrice)} KRW` : 'Hidden'}</strong>
      </div>
      <small>
        {card.priceMethod} · confidence {(card.confidence * 100).toFixed(0)}%
      </small>
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
