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

export function MyAssetsPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [status, setStatus] = useState('');

  async function loadAssets() {
    setLoading(true);
    const response = await fetch(`${API_BASE}/assets/me`, {
      headers: { 'x-user-email': 'demo@caskfolio.com' }
    });

    if (!response.ok) {
      setLoading(false);
      setStatus('Failed to load assets');
      return;
    }

    const data = (await response.json()) as Asset[];
    setAssets(data);
    setLoading(false);
  }

  useEffect(() => {
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
        <button className="btn ghost" type="button" onClick={createShareLink}>
          Generate Share Link
        </button>
      </div>

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
