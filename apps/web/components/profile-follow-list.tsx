'use client';

import { useState } from 'react';
import { readAuthContext } from '../lib/auth-state';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

type FollowKind = 'followers' | 'following';

type FollowUser = {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  followedAt: string;
};

type FollowPageResponse = {
  items: FollowUser[];
  nextCursor: string | null;
};

interface Props {
  username: string;
  followerCount: number;
  followingCount: number;
}

export function ProfileFollowList({ username, followerCount, followingCount }: Props) {
  const [activeTab, setActiveTab] = useState<FollowKind | null>(null);
  const [items, setItems] = useState<FollowUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadFirst(kind: FollowKind) {
    setActiveTab(kind);
    setLoading(true);
    setError('');

    try {
      const data = await fetchFollowPage(username, kind);
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setItems([]);
      setNextCursor(null);
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!activeTab || !nextCursor || loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchFollowPage(username, activeTab, nextCursor);
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가 로드 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="card" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>Connections</h3>
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn ghost" type="button" onClick={() => void loadFirst('followers')} disabled={loading}>
          Followers {followerCount}
        </button>
        <button className="btn ghost" type="button" onClick={() => void loadFirst('following')} disabled={loading}>
          Following {followingCount}
        </button>
      </div>

      {activeTab ? (
        <div style={{ marginTop: 12 }}>
          <p className="sub" style={{ marginBottom: 8 }}>
            {activeTab === 'followers' ? 'Followers' : 'Following'} list
          </p>
          {loading && !items.length ? <p className="sub">Loading...</p> : null}
          {error ? <p className="sub">{error}</p> : null}
          {!loading && !error && !items.length ? <p className="sub">No users found.</p> : null}
          {items.length ? (
            <div className="grid" style={{ gap: 8 }}>
              {items.map((user) => (
                <article key={user.id} className="card" style={{ padding: 12 }}>
                  <div className="asset-row-head">
                    <div>
                      <strong>{user.name}</strong>
                      <p className="sub" style={{ margin: '2px 0 0' }}>
                        @{user.username}
                      </p>
                    </div>
                    {user.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.profileImage}
                        alt={user.username}
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
                      />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {nextCursor ? (
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn ghost" type="button" onClick={() => void loadMore()} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

async function fetchFollowPage(username: string, kind: FollowKind, cursor?: string): Promise<FollowPageResponse> {
  const auth = readAuthContext(window.localStorage);
  if (!auth?.email) throw new Error('로그인이 필요합니다.');

  const query = new URLSearchParams({ limit: '20' });
  if (cursor) query.set('cursor', cursor);

  const response = await fetch(`${API_BASE}/u/${encodeURIComponent(username)}/${kind}?${query.toString()}`, {
    headers: {
      'x-user-email': auth.email
    }
  });

  if (response.status === 401) throw new Error('로그인이 필요합니다.');
  if (!response.ok) throw new Error('목록을 불러오지 못했습니다.');
  return (await response.json()) as FollowPageResponse;
}
