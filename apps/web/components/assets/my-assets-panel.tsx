'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

type Asset = {
  id: string;
  displayName: string;
  purchasePrice: number;
  trustedPrice: number | null;
  visibility: 'PUBLIC' | 'PRIVATE';
};

export function hasAccessToken(storage: Pick<Storage, 'getItem'> | null) {
  if (!storage) return false;
  return Boolean(storage.getItem('caskfolio_access_token'));
}

export function MyAssetsPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [status, setStatus] = useState('');

  async function loadAssets() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/assets/me`, {
        headers: { 'x-user-email': 'demo@caskfolio.com' }
      });

      if (!response.ok) {
        setStatus('Failed to load assets');
        return;
      }

      const data = (await response.json()) as Asset[];
      setAssets(data);
    } catch {
      setStatus('Please sign in first');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const authenticated = hasAccessToken(typeof window === 'undefined' ? null : window.localStorage);
    setIsAuthenticated(authenticated);
    if (!authenticated) {
      setLoading(false);
      return;
    }
    void loadAssets();
  }, []);

  async function toggleVisibility(asset: Asset) {
    setStatus('Updating visibility...');

    const response = await fetch(`${API_BASE}/assets/${asset.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'demo@caskfolio.com'
      },
      body: JSON.stringify({ visibility: asset.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' })
    });

    if (!response.ok) {
      setStatus('Failed to update visibility');
      return;
    }

    await loadAssets();
    setStatus('Visibility updated');
  }

  async function createShareLink() {
    setStatus('Creating share link...');

    const selectedAssetIds = assets.filter((asset) => asset.visibility === 'PUBLIC').map((asset) => asset.id);
    const response = await fetch(`${API_BASE}/portfolio/me/share-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'demo@caskfolio.com'
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

  return (
    <section className="assets-panel card">
      <div className="assets-panel-head">
        <h2>My Assets</h2>
        {isAuthenticated ? (
          <button className="btn ghost" type="button" onClick={createShareLink}>
            Generate Share Link
          </button>
        ) : null}
      </div>

      {!isAuthenticated ? <p>Login required to view your portfolio assets.</p> : null}

      {loading ? <p>Loading assets...</p> : null}

      {!loading && !assets.length ? <p>No assets yet.</p> : null}

      {!loading && assets.length ? (
        <div className="asset-list">
          {assets.map((asset) => (
            <article key={asset.id} className="asset-row">
              <div>
                <strong>{asset.displayName || 'Unknown Whisky'}</strong>
                <p>
                  Purchase {asset.purchasePrice.toLocaleString()} KRW · Trusted{' '}
                  {asset.trustedPrice ? `${asset.trustedPrice.toLocaleString()} KRW` : 'N/A'}
                </p>
              </div>
              <button className="btn ghost" type="button" onClick={() => toggleVisibility(asset)}>
                {asset.visibility === 'PUBLIC' ? 'Make Private' : 'Make Public'}
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {shareLink ? <small>Share: {shareLink}</small> : null}
      {status ? <small>{status}</small> : null}
    </section>
  );
}
