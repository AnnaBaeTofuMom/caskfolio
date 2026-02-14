'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FeedCard } from '@caskfolio/types';
import type { Route } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

type FeedComment = NonNullable<FeedCard['comments']>[number];

export function FeedCardItem({ card }: { card: FeedCard }) {
  const router = useRouter();
  const images = card.imageUrls?.length ? card.imageUrls : card.imageUrl ? [card.imageUrl] : [];
  const hasImage = images.length > 0;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(Boolean(card.isFollowing));
  const [pendingFollow, setPendingFollow] = useState(false);
  const [likeCount, setLikeCount] = useState(card.likeCount ?? 0);
  const [likedByMe, setLikedByMe] = useState(Boolean(card.likedByMe));
  const [pendingLike, setPendingLike] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>(card.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [replyParentId, setReplyParentId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editBody, setEditBody] = useState(card.caption ?? '');
  const [hidden, setHidden] = useState(false);
  const [status, setStatus] = useState('');
  const [poll, setPoll] = useState(card.poll);
  const userEmail = typeof window === 'undefined' ? null : window.localStorage.getItem('caskfolio_user_email');
  const showAssetWidget = Boolean(card.purchasePrice && card.purchasePrice > 0);
  const isAuthenticated = Boolean(userEmail);

  const canFollow = !card.isOwnAsset && !isFollowing;

  function redirectToSignup() {
    router.push('/login' as Route);
  }

  async function followOwner() {
    if (!userEmail) {
      redirectToSignup();
      return;
    }
    if (!canFollow || pendingFollow) return;
    setPendingFollow(true);
    try {
      const response = await fetch(`${API_BASE}/social/follow/${card.owner.id}`, {
        method: 'POST',
        headers: { 'x-user-email': userEmail }
      });
      if (response.ok) setIsFollowing(true);
    } finally {
      setPendingFollow(false);
    }
  }

  async function toggleLike() {
    if (!userEmail) {
      redirectToSignup();
      return;
    }
    if (pendingLike) return;
    setPendingLike(true);
    try {
      const response = await fetch(`${API_BASE}/social/feed/${card.assetId}/like`, {
        method: likedByMe ? 'DELETE' : 'POST',
        headers: { 'x-user-email': userEmail }
      });
      if (!response.ok) return;
      const data = (await response.json()) as { likeCount?: number; liked?: boolean };
      setLikeCount(data.likeCount ?? likeCount);
      setLikedByMe(data.liked ?? !likedByMe);
    } finally {
      setPendingLike(false);
    }
  }

  async function submitComment() {
    if (!userEmail) {
      redirectToSignup();
      return;
    }
    if (!commentText.trim()) return;
    const response = await fetch(`${API_BASE}/social/feed/${card.assetId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({
        content: commentText,
        parentCommentId: replyParentId || undefined
      })
    });
    if (!response.ok) return;

    const reloaded = await fetch(`${API_BASE}/social/feed/${card.assetId}/comments`, {
      headers: { 'x-user-email': userEmail }
    });
    if (!reloaded.ok) return;
    const data = (await reloaded.json()) as FeedComment[];
    setComments(data);
    setCommentText('');
    setReplyParentId('');
  }

  async function savePost() {
    if (!userEmail) return;
    const response = await fetch(`${API_BASE}/social/feed/${card.assetId}/post`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ title: editTitle, body: editBody })
    });
    if (!response.ok) {
      setStatus('수정 실패');
      return;
    }
    setStatus('수정 완료');
    setIsEditing(false);
  }

  async function deletePost() {
    if (!userEmail) return;
    const confirmDelete = window.confirm('이 피드 글을 삭제하시겠습니까?');
    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE}/social/feed/${card.assetId}/post`, {
      method: 'DELETE',
      headers: { 'x-user-email': userEmail }
    });
    if (!response.ok) {
      setStatus('삭제 실패');
      return;
    }
    setHidden(true);
  }

  async function votePoll(optionIndex: number) {
    if (!userEmail) {
      redirectToSignup();
      return;
    }
    if (!poll) return;
    const response = await fetch(`${API_BASE}/social/feed/${card.assetId}/poll/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ optionIndex })
    });
    if (!response.ok) return;
    const nextCounts = [...poll.voteCounts];
    const previous = poll.votedOptionIndex;
    if (typeof previous === 'number' && previous >= 0 && previous < nextCounts.length) {
      nextCounts[previous] = Math.max(nextCounts[previous] - 1, 0);
    }
    nextCounts[optionIndex] = (nextCounts[optionIndex] ?? 0) + 1;
    setPoll({
      ...poll,
      voteCounts: nextCounts,
      totalVotes: poll.totalVotes + (typeof previous === 'number' ? 0 : 1),
      votedOptionIndex: optionIndex
    });
  }

  if (hidden) return null;

  return (
    <article className="card feed-card">
      <div className={`feed-grid ${hasImage ? 'with-image' : 'no-image'}`}>
        <div className="feed-content">
          <div className="feed-head-row">
            <div className="feed-user-row">
              <Link href={`/u/${card.owner.username}`}>
                <strong>@{card.owner.username}</strong>
              </Link>
              {!card.isOwnAsset ? (
                <button className="btn ghost feed-follow-btn" type="button" disabled={isAuthenticated ? !canFollow || pendingFollow : false} onClick={() => void followOwner()}>
                  {isFollowing ? '팔로잉 중' : pendingFollow ? '팔로우 중...' : '팔로우'}
                </button>
              ) : null}
            </div>
            <div className="actions" style={{ marginTop: 0 }}>
              {card.hasBox ? <span className="badge">Boxed</span> : null}
              {card.isOwnAsset ? (
                <>
                  <button className="btn ghost" type="button" onClick={() => setIsEditing((prev) => !prev)}>
                    Edit
                  </button>
                  <button className="btn ghost" type="button" onClick={() => void deletePost()}>
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="form-grid">
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={4} placeholder="Body" />
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="btn primary" type="button" onClick={() => void savePost()}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3>{card.title}</h3>
              {card.productLine ? <p className="sub feed-subtitle">{card.productLine}</p> : null}
              {card.caption ? <p>{card.caption}</p> : null}
            </>
          )}

          {showAssetWidget ? (
            <article className="card asset-widget-card">
              <div className="feed-metrics asset-widget-metrics">
                <article className="metric">
                  <p>Current</p>
                  <strong>{card.currentValue ? `${formatNumber(card.currentValue)} KRW` : 'Hidden'}</strong>
                </article>
                <article className="metric">
                  <p>Purchase</p>
                  <strong>{card.purchasePrice ? `${formatNumber(card.purchasePrice)} KRW` : 'N/A'}</strong>
                </article>
                <article className="metric metric-performance">
                  <p>Perf</p>
                  <strong className={performanceClass(card.purchasePrice, card.currentValue)}>
                    <span className="material-symbols-outlined">trending_up</span>
                    {formatPerformance(card.purchasePrice, card.currentValue)}
                  </strong>
                </article>
              </div>
            </article>
          ) : null}

          {poll ? (
            <article className="card poll-widget-card">
              <p style={{ marginTop: 0, fontWeight: 700 }}>{poll.question}</p>
              <div className="feed-comment-list">
                {poll.options.map((option, index) => (
                  <button key={option + index} className="btn ghost" type="button" onClick={() => void votePoll(index)}>
                    {option}
                    {typeof poll.votedOptionIndex === 'number'
                      ? ` · ${formatPollPercent(poll.voteCounts[index] ?? 0, poll.totalVotes)}`
                      : ''}
                    {poll.votedOptionIndex === index ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </article>
          ) : null}

          <div className="card feed-comments-card">
            <div className="feed-comments-head">
              <button className="btn ghost" type="button" onClick={() => void toggleLike()} disabled={pendingLike}>
                {likedByMe ? '❤️ Liked' : '🤍 Like'} {likeCount}
              </button>
              <span className="sub">Comments {comments.length}</span>
            </div>
            {comments.length ? (
              <div className="feed-comment-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="feed-comment-item">
                    <p style={{ margin: 0 }}>
                      <strong>@{comment.user.username}</strong> {comment.content}
                    </p>
                    <button className="btn ghost" type="button" onClick={() => setReplyParentId(comment.id)}>
                      Reply
                    </button>
                    {(comment.replies ?? []).map((reply) => (
                      <p key={reply.id} className="feed-reply-item">
                        <strong>@{reply.user.username}</strong> {reply.content}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="sub" style={{ margin: 0 }}>
                No comments yet.
              </p>
            )}
            <div className="actions" style={{ marginTop: 8 }}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onFocus={() => {
                  if (!isAuthenticated) redirectToSignup();
                }}
                placeholder={replyParentId ? 'Write a reply...' : 'Write a comment...'}
              />
              <button className="btn primary" type="button" onClick={() => void submitComment()}>
                Send
              </button>
            </div>
          </div>

          <div className="feed-foot">
            <small className="feed-confidence">Price Confidence: {Math.round((card.confidence ?? 0) * 100)}%</small>
            <small>
              <span className="material-symbols-outlined">calendar_month</span>
              Added {formatDate(card.createdAt)}
            </small>
            {status ? <small>{status}</small> : null}
          </div>
        </div>
        {hasImage ? (
          <aside className="feed-media-panel">
            <div className="feed-media-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="feed-media-image" src={images[currentImageIndex]} alt={`${card.title} image ${currentImageIndex + 1}`} />
            </div>
            {images.length > 1 ? (
              <div className="feed-media-controls">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                >
                  Prev
                </button>
                <small>{currentImageIndex + 1} / {images.length}</small>
                <button className="btn ghost" type="button" onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}>
                  Next
                </button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </article>
  );
}

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = date.getUTCFullYear();
  const month = monthNames[date.getUTCMonth()];
  const day = date.getUTCDate();
  return `${month} ${day}, ${year}`;
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

function performanceClass(purchasePrice?: number, currentValue?: number) {
  if (!purchasePrice || !currentValue || purchasePrice <= 0) return '';
  return currentValue >= purchasePrice ? 'perf-up' : 'perf-down';
}

function formatPollPercent(votes: number, totalVotes: number) {
  if (!totalVotes || totalVotes <= 0) return '0%';
  return `${Math.round((votes / totalVotes) * 100)}%`;
}
