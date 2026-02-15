'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readAuthContext } from '../../lib/auth-state';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

type Asset = {
  id: string;
  displayName: string;
  purchasePrice: number;
  trustedPrice: number | null;
  purchaseDate: string;
  boxAvailable: boolean;
  photoUrl: string | null;
  caption: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
};

type PostItem = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  imageUrls: string[];
  linkedAssetId?: string;
  productLine?: string;
  displayName: string;
  purchasePrice: number;
  trustedPrice: number | null;
  hasBox: boolean;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
};

type MyAssetsPanelProps = {
  showAssets?: boolean;
  showPosts?: boolean;
  postsPreviewCount?: number;
  showShareActions?: boolean;
};

export function hasAccessToken(storage: Pick<Storage, 'getItem'> | null) {
  if (!storage) return false;
  return Boolean(storage.getItem('caskfolio_access_token'));
}

export function MyAssetsPanel({
  showAssets = true,
  showPosts = true,
  postsPreviewCount = 1,
  showShareActions = true
}: MyAssetsPanelProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [status, setStatus] = useState('');
  const [updatingAssetId, setUpdatingAssetId] = useState('');

  async function loadAssetsAndPosts(email: string) {
    setLoading(true);
    try {
      const [assetsResponse, postsResponse] = await Promise.all([
        fetch(`${API_BASE}/assets/me`, {
          headers: { 'x-user-email': email }
        }),
        fetch(`${API_BASE}/social/me/posts`, {
          headers: { 'x-user-email': email }
        })
      ]);

      if (!assetsResponse.ok || !postsResponse.ok) {
        setStatus('Failed to load assets');
        return;
      }

      const assetsData = (await assetsResponse.json()) as Asset[];
      const postsData = (await postsResponse.json()) as PostItem[];
      setAssets(assetsData);
      setPosts(postsData);
    } catch {
      setStatus('Please sign in first');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const auth = typeof window === 'undefined' ? null : readAuthContext(window.localStorage);
    if (!auth?.token || !auth.email) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    setIsAuthenticated(true);
    setUserEmail(auth.email);
    void loadAssetsAndPosts(auth.email);
  }, []);

  async function toggleVisibility(asset: Asset) {
    setUpdatingAssetId(asset.id);
    setStatus('Updating visibility...');
    try {
      const response = await fetch(`${API_BASE}/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify({ visibility: asset.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' })
      });

      if (!response.ok) {
        setStatus('Failed to update visibility');
        return;
      }

      await loadAssetsAndPosts(userEmail);
      setStatus('Visibility updated');
    } catch {
      setStatus('Failed to update visibility');
    } finally {
      setUpdatingAssetId('');
    }
  }

  async function createShareLink() {
    setStatus('Creating share link...');

    const selectedAssetIds = assets.filter((asset) => asset.visibility === 'PUBLIC').map((asset) => asset.id);
    const response = await fetch(`${API_BASE}/portfolio/me/share-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ selectedAssetIds })
    });

    if (!response.ok) {
      setStatus('Failed to create share link');
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (data.url) {
      setShareLink(data.url);
      setStatus('Share link generated');
    }
  }

  async function removePhoto(assetId: string) {
    setUpdatingAssetId(assetId);
    setStatus('Removing photo...');
    try {
      const response = await fetch(`${API_BASE}/assets/${assetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify({ photoUrl: null })
      });

      if (!response.ok) {
        setStatus('Failed to remove photo');
        return;
      }

      await loadAssetsAndPosts(userEmail);
      setStatus('Photo removed');
    } catch {
      setStatus('Failed to remove photo');
    } finally {
      setUpdatingAssetId('');
    }
  }

  async function deleteAsset(assetId: string, type: 'asset' | 'post') {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(type === 'post' ? '이 피드를 삭제할까요?' : '이 자산을 삭제할까요?');
      if (!ok) return;
    }

    setUpdatingAssetId(assetId);
    setStatus(type === 'post' ? 'Deleting post...' : 'Deleting asset...');
    try {
      const response = await fetch(type === 'post' ? `${API_BASE}/social/feed/${assetId}/post` : `${API_BASE}/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': userEmail
        }
      });

      if (!response.ok) {
        setStatus(type === 'post' ? 'Failed to delete post' : 'Failed to delete asset');
        return;
      }

      await loadAssetsAndPosts(userEmail);
      setStatus(type === 'post' ? 'Post deleted' : 'Asset deleted');
    } catch {
      setStatus(type === 'post' ? 'Failed to delete post' : 'Failed to delete asset');
    } finally {
      setUpdatingAssetId('');
    }
  }

  const whiskyItems = assets;
  const visiblePosts = showPosts ? (postsPreviewCount > 0 ? posts.slice(0, postsPreviewCount) : posts) : [];
  const hasMorePosts = showPosts && postsPreviewCount > 0 && posts.length > postsPreviewCount;

  return (
    <section className="assets-panel">
      {!isAuthenticated ? <article className="card">Login required to view your portfolio assets.</article> : null}

      {loading ? <article className="card">Loading assets...</article> : null}

      {!loading && !assets.length && !posts.length ? <article className="card">No assets yet.</article> : null}

      {!loading && showAssets && whiskyItems.length ? (
        <div className="asset-list">
          {whiskyItems.map((asset) => {
            const performance =
              asset.trustedPrice && asset.purchasePrice > 0
                ? ((asset.trustedPrice - asset.purchasePrice) / asset.purchasePrice) * 100
                : null;

            return (
              <article key={asset.id} className="card asset-card">
                <div className="asset-media">
                  {asset.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="asset-photo" src={asset.photoUrl} alt={asset.displayName} />
                  ) : (
                    <div className="asset-photo asset-photo-placeholder">{asset.displayName}</div>
                  )}
                </div>
                <div className="asset-main">
                  <div className="asset-row-head">
                    <div>
                      <h3>{asset.displayName || 'Unknown Whisky'}</h3>
                      <p className="sub">{formatDate(asset.purchaseDate)}</p>
                    </div>
                    <div className="feed-badges">
                      {asset.boxAvailable ? <span className="badge">Boxed</span> : null}
                      <span className="badge">{asset.visibility === 'PUBLIC' ? 'Public' : 'Private'}</span>
                    </div>
                  </div>
                  {asset.caption ? <p>{asset.caption}</p> : null}
                  <div className="feed-metrics">
                    <article className="metric">
                      <p>Purchase Price</p>
                      <strong>{asset.purchasePrice.toLocaleString()} KRW</strong>
                    </article>
                    <article className="metric">
                      <p>Current Value</p>
                      <strong>{asset.trustedPrice ? `${asset.trustedPrice.toLocaleString()} KRW` : 'Hidden'}</strong>
                    </article>
                    <article className="metric">
                      <p>Performance</p>
                      <strong>{performance === null ? 'N/A' : `${performance > 0 ? '+' : ''}${performance.toFixed(1)}%`}</strong>
                    </article>
                  </div>
                  <div className="actions asset-actions">
                    {asset.photoUrl ? (
                      <button className="btn ghost" type="button" onClick={() => removePhoto(asset.id)} disabled={updatingAssetId === asset.id}>
                        Remove Photo
                      </button>
                    ) : null}
                    <button className="btn ghost" type="button" onClick={() => deleteAsset(asset.id, 'asset')} disabled={updatingAssetId === asset.id}>
                      Delete Asset
                    </button>
                    <label className="visibility-toggle" aria-label={`Toggle visibility for ${asset.displayName}`}>
                      <span>Public in feed</span>
                      <input
                        type="checkbox"
                        checked={asset.visibility === 'PUBLIC'}
                        onChange={() => toggleVisibility(asset)}
                        disabled={updatingAssetId === asset.id}
                      />
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {!loading && showAssets && !whiskyItems.length ? <article className="card">No whisky assets yet.</article> : null}

      {!loading && showPosts ? (
        <section style={{ marginTop: showAssets ? 18 : 0 }}>
          <div className="assets-panel-head">
            <div>
              <h3 style={{ margin: 0 }}>My Posts</h3>
              <p className="sub" style={{ marginBottom: 0 }}>
                Latest posts from your collection feed
              </p>
            </div>
            {hasMorePosts ? (
              <Link href="/portfolio/posts" className="btn ghost">
                더보기
              </Link>
            ) : null}
          </div>
          {visiblePosts.length ? (
            <div className="asset-list">
              {visiblePosts.map((post) => (
                <article key={post.id} className="card asset-card">
                  <div className="asset-media">
                    {post.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="asset-photo" src={post.imageUrl} alt={post.displayName} />
                    ) : (
                      <div className="asset-photo asset-photo-placeholder">{post.displayName}</div>
                    )}
                  </div>
                  <div className="asset-main">
                    <div className="asset-row-head">
                      <div>
                        <h3>{post.displayName || 'Untitled Post'}</h3>
                        <p className="sub">{formatDate(post.createdAt)}</p>
                      </div>
                      <span className="badge">{post.visibility === 'PUBLIC' ? 'Public' : 'Private'}</span>
                    </div>
                    {post.body ? <p>{post.body}</p> : null}
                    <div className="actions asset-actions">
                      <button className="btn ghost" type="button" onClick={() => deleteAsset(post.id, 'post')} disabled={updatingAssetId === post.id}>
                        Delete Post
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article className="card">No posts yet.</article>
          )}
        </section>
      ) : null}

      {isAuthenticated && showShareActions ? (
        <div className="actions">
          <button className="btn ghost" type="button" onClick={createShareLink}>
            Generate Share Link
          </button>
        </div>
      ) : null}
      {shareLink ? <small>Share: {shareLink}</small> : null}
      {status ? <small>{status}</small> : null}
    </section>
  );
}

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
