'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { readAuthContext } from '../lib/auth-state';
import { optimizeImageFile } from '../lib/image-optimize';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

type MyAsset = {
  id: string;
  displayName: string;
  variantId?: string;
  customProductName?: string | null;
  purchasePrice: number;
  purchaseDate: string;
  boxAvailable: boolean;
  trustedPrice: number | null;
  photoUrl: string | null;
  photoUrls?: string[];
  visibility: 'PUBLIC' | 'PRIVATE';
};

export function isAssetWidgetSelectable(assetCount: number): boolean {
  return assetCount > 0;
}

export function FeedPostForm() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [assets, setAssets] = useState<MyAsset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [widgetType, setWidgetType] = useState<'NONE' | 'ASSET' | 'POLL'>('NONE');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isAttachingPhotos, setIsAttachingPhotos] = useState(false);
  const [photoAttachProgress, setPhotoAttachProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const widgetAssets = assets;
  const selectedAsset = useMemo(() => widgetAssets.find((asset) => asset.id === assetId) ?? null, [assetId, widgetAssets]);
  const canSelectAssetWidget = isAssetWidgetSelectable(widgetAssets.length);

  useEffect(() => {
    const auth = readAuthContext(window.localStorage);
    if (!auth?.token || !auth.email) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    setIsAuthenticated(true);
    setUserEmail(auth.email);

    fetch(`${API_BASE}/assets/me`, {
      headers: { 'x-user-email': auth.email }
    })
      .then(async (response) => {
        if (!response.ok) {
          setStatus('자산 목록을 불러오지 못했습니다.');
          return;
        }
        const data = (await response.json()) as MyAsset[];
        setAssets(data);
      })
      .catch(() => setStatus('API 서버에 연결할 수 없습니다.'))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated || !userEmail) {
      setStatus('로그인이 필요합니다.');
      return;
    }
    if (!title.trim()) {
      setStatus('제목을 입력해주세요.');
      return;
    }
    if (!body.trim()) {
      setStatus('본문을 입력해주세요.');
      return;
    }
    if (widgetType === 'ASSET' && !assetId) {
      setStatus('Asset 위젯을 선택한 경우 자산을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    setStatus('게시 중...');

    try {
      const fallbackAssetPhotos =
        widgetType === 'ASSET'
          ? selectedAsset?.photoUrls?.length
            ? selectedAsset.photoUrls
            : selectedAsset?.photoUrl
              ? [selectedAsset.photoUrl]
              : []
          : [];
      const finalPhotoUrls = photoUrls.length ? photoUrls : fallbackAssetPhotos;

      const response = await fetch(`${API_BASE}/social/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          linkedAssetId: widgetType === 'ASSET' ? assetId : undefined,
          variantId: selectedAsset?.variantId || undefined,
          photoUrl: finalPhotoUrls[0] ?? undefined,
          photoUrls: finalPhotoUrls.length ? finalPhotoUrls : undefined,
          visibility: 'PUBLIC',
          poll:
            widgetType === 'POLL'
              ? {
                  question: pollQuestion,
                  options: pollOptions
                }
              : undefined
        })
      });

      if (!response.ok) {
        setStatus('게시에 실패했습니다.');
        return;
      }

      if (widgetType === 'POLL') {
        const options = pollOptions.map((option) => option.trim()).filter(Boolean);
        if (!pollQuestion.trim() || options.length < 2) {
          setStatus('Poll 위젯은 질문과 2개 이상 보기 항목이 필요합니다.');
          return;
        }
      }

      setStatus('게시 완료');
      router.push('/feed');
    } catch {
      setStatus('API 서버에 연결할 수 없습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onPhotoFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const slots = Math.max(0, 8 - photoUrls.length);
    if (slots <= 0) {
      setStatus('최대 8장까지 첨부할 수 있습니다.');
      event.target.value = '';
      return;
    }
    const limited = files.slice(0, slots);
    const converted: string[] = [];
    setIsAttachingPhotos(true);
    setPhotoAttachProgress(0);
    for (const file of limited) {
      try {
        converted.push(await optimizeImageFile(file));
      } catch {
        try {
          converted.push(await fileToDataUrl(file));
        } catch {
          setStatus('일부 이미지 처리에 실패했습니다.');
        }
      }
      setPhotoAttachProgress(Math.round((converted.length / limited.length) * 100));
    }
    setPhotoUrls((prev) => [...prev, ...converted]);
    setPhotoAttachProgress(100);
    setTimeout(() => {
      setIsAttachingPhotos(false);
      setPhotoAttachProgress(0);
    }, 250);
    event.target.value = '';
  }

  if (loading) {
    return <article className="card">Loading...</article>;
  }

  if (!isAuthenticated) {
    return <article className="card">로그인이 필요합니다.</article>;
  }

  return (
    <form className="card form-grid" onSubmit={onSubmit}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="포스트 제목" />
      </label>

      <label>
        Body
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="컬렉션 스토리를 작성하세요." rows={5} />
      </label>

      <label>
        Photos (multiple)
        <input type="file" accept="image/*" multiple onChange={onPhotoFilesChange} />
      </label>
      {isAttachingPhotos ? (
        <div className="upload-progress-wrap" aria-live="polite">
          <div className="upload-progress-head">
            <small>사진 첨부 중...</small>
            <small>{photoAttachProgress}%</small>
          </div>
          <div className="upload-progress-track">
            <div className="upload-progress-fill" style={{ width: `${photoAttachProgress}%` }} />
          </div>
        </div>
      ) : null}
      {photoUrls.length ? (
        <div>
          <p className="sub" style={{ margin: '0 0 0.35rem' }}>
            {photoUrls.length} photo(s) selected
          </p>
          <div className="photo-preview-grid">
            {photoUrls.map((url, index) => (
              <div key={`${url.slice(0, 30)}-${index}`} className="photo-preview-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Preview ${index + 1}`} className="photo-preview-item" />
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={() => setPhotoUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <label>
        Widget (optional)
        <select value={widgetType} onChange={(e) => setWidgetType(e.target.value as 'NONE' | 'ASSET' | 'POLL')}>
          <option value="NONE">None</option>
          <option value="ASSET" disabled={!canSelectAssetWidget}>
            Asset widget
          </option>
          <option value="POLL">Poll widget</option>
        </select>
      </label>
      {!canSelectAssetWidget ? (
        <p className="sub">
          등록된 자산이 없어 Asset widget은 사용할 수 없습니다. 일반 포스트(None/Poll)는 바로 작성할 수 있습니다.{' '}
          <Link href="/assets/register">자산 등록</Link>
        </p>
      ) : null}

      {widgetType === 'ASSET' ? (
        <>
          <label>
            Asset Widget Source
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">자산 선택</option>
              {widgetAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.displayName}
                </option>
              ))}
            </select>
          </label>

          {selectedAsset ? (
            <article className="card">
              <p style={{ marginTop: 0, fontWeight: 700 }}>{selectedAsset.displayName}</p>
              <p className="sub" style={{ marginBottom: 0 }}>
                Purchase {selectedAsset.purchasePrice.toLocaleString()} KRW
                {selectedAsset.trustedPrice ? ` · Current ${selectedAsset.trustedPrice.toLocaleString()} KRW` : ''}
              </p>
            </article>
          ) : null}
        </>
      ) : null}

      {widgetType === 'POLL' ? (
        <div className="card form-grid">
          <label>
            Poll Question
            <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="질문 입력" />
          </label>
          {pollOptions.map((option, index) => (
            <label key={index}>
              Option {index + 1}
              <input
                value={option}
                onChange={(e) =>
                  setPollOptions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? e.target.value : item)))
                }
                placeholder={`보기 ${index + 1}`}
              />
            </label>
          ))}
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn ghost" type="button" onClick={() => setPollOptions((prev) => [...prev, ''])}>
              Add Option
            </button>
          </div>
        </div>
      ) : null}

      <button className="btn primary" type="submit" disabled={submitting || isAttachingPhotos}>
        {submitting ? 'Posting...' : 'Publish Post'}
      </button>
      {status ? <small>{status}</small> : null}
    </form>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('invalid image'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}
