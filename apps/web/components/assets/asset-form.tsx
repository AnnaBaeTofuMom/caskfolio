'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readAuthContext } from '../../lib/auth-state';
import { optimizeImageFile } from '../../lib/image-optimize';

type Brand = { id: string; name: string };
type Product = { id: string; name: string; brandId: string };
type Variant = { id: string; releaseYear: number | null; bottleSize: number | null; region: string | null; specialTag: string | null };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api-proxy';

export function AssetForm() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [brandQuery, setBrandQuery] = useState('');
  const [brandId, setBrandId] = useState('');
  const [showBrandMenu, setShowBrandMenu] = useState(false);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [boxAvailable, setBoxAvailable] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PUBLIC');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{
    variantOrName?: string;
    purchasePrice?: string;
    purchaseDate?: string;
  }>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const variantSelectRef = useRef<HTMLSelectElement>(null);
  const customProductNameRef = useRef<HTMLInputElement>(null);
  const purchasePriceRef = useRef<HTMLInputElement>(null);
  const purchaseDateRef = useRef<HTMLInputElement>(null);
  const brandBlurTimer = useRef<number | null>(null);

  const selectedBrandName = useMemo(() => brands.find((brand) => brand.id === brandId)?.name ?? '', [brandId, brands]);
  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((brand) => brand.name.toLowerCase().includes(q));
  }, [brandQuery, brands]);

  useEffect(() => {
    const auth = readAuthContext(window.localStorage);
    setIsAuthenticated(Boolean(auth?.token) && Boolean(auth?.email));
    setUserEmail(auth?.email ?? '');
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/catalog/brands`)
      .then((res) => res.json())
      .then((data: Brand[]) => setBrands(data))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!brandId) {
      setProducts([]);
      setProductId('');
      setVariants([]);
      setVariantId('');
      return;
    }

    fetch(`${API_BASE}/catalog/products?brandId=${encodeURIComponent(brandId)}`)
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProducts([]));
  }, [brandId]);

  useEffect(() => {
    if (!productId) {
      setVariants([]);
      setVariantId('');
      return;
    }

    fetch(`${API_BASE}/catalog/variants?productId=${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((data: Variant[]) => setVariants(data))
      .catch(() => setVariants([]));
  }, [productId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    if (!isAuthenticated) {
      setMessage('로그인 후 자산 등록이 가능합니다.');
      return;
    }
    setMessage('Saving...');

    const resolvedName = customProductName.trim();
    const parsedPrice = Number(purchasePrice);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage('');
      setErrors({ purchasePrice: '구매가는 0보다 커야 합니다.' });
      purchasePriceRef.current?.focus();
      return;
    }

    if (!purchaseDate) {
      setMessage('');
      setErrors({ purchaseDate: '구매일을 입력해주세요.' });
      purchaseDateRef.current?.focus();
      return;
    }

    if (!variantId && !resolvedName) {
      setMessage('');
      setErrors({ variantOrName: '버전을 선택하거나 Product Name을 입력해주세요.' });
      if (productId) variantSelectRef.current?.focus();
      else customProductNameRef.current?.focus();
      return;
    }

    const body = {
      variantId: variantId || undefined,
      customProductName: resolvedName || undefined,
      purchasePrice: parsedPrice,
      purchaseDate,
      bottleCondition: 'SEALED',
      boxAvailable,
      storageLocation: 'HOME',
      photoUrl: photoUrl || undefined,
      caption: caption || undefined,
      visibility
    };

    try {
      const res = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        let reason = 'Failed to register asset';
        try {
          const errorData = (await res.json()) as { message?: string | string[] };
          if (Array.isArray(errorData.message)) reason = errorData.message.join(', ');
          else if (typeof errorData.message === 'string') reason = errorData.message;
        } catch {
          // no-op: keep generic fallback
        }
        setMessage(reason);
        return;
      }

      setMessage('Asset registered');
      setBrandQuery('');
      setBrandId('');
      setProductId('');
      setVariantId('');
      setCustomProductName('');
      setPurchasePrice('');
      setPurchaseDate('');
      setBoxAvailable(false);
      setPhotoUrl('');
      setCaption('');
      setVisibility('PUBLIC');
      setErrors({});
      router.push('/portfolio');
    } catch {
      setMessage('Cannot connect to API server');
    }
  }

  function onPhotoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    optimizeImageFile(file)
      .then((optimized) => setPhotoUrl(optimized))
      .catch(() => setMessage('Failed to process image'));
  }

  return (
    <form suppressHydrationWarning className="card form-grid" onSubmit={onSubmit}>
      {!isAuthenticated ? (
        <small>Please sign in first. You can still fill this form, but submit is blocked until login.</small>
      ) : null}
      <label>
        Brand (search and select)
        <div className="brand-search">
          <input
            suppressHydrationWarning
            value={brandQuery}
            onFocus={() => {
              if (brandBlurTimer.current) window.clearTimeout(brandBlurTimer.current);
              setShowBrandMenu(true);
            }}
            onBlur={() => {
              brandBlurTimer.current = window.setTimeout(() => setShowBrandMenu(false), 120);
            }}
            onChange={(e) => {
              const value = e.target.value;
              setBrandQuery(value);
              setBrandId('');
              setProductId('');
              setVariantId('');
            }}
            placeholder="Type brand name..."
          />
          {showBrandMenu ? (
            <div className="brand-menu">
              {filteredBrands.length ? (
                filteredBrands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    className="brand-option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setBrandId(brand.id);
                      setBrandQuery(brand.name);
                      setShowBrandMenu(false);
                    }}
                  >
                    {brand.name}
                  </button>
                ))
              ) : (
                <p className="brand-empty">No matching brands</p>
              )}
            </div>
          ) : null}
        </div>
      </label>

      <label>
        Product Line
        <select suppressHydrationWarning value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!brandId}>
          <option value="">Select product line</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Version
        <select suppressHydrationWarning ref={variantSelectRef} value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!productId}>
          <option value="">Select version</option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {[variant.releaseYear, variant.bottleSize ? `${variant.bottleSize}ml` : null, variant.region, variant.specialTag]
                .filter(Boolean)
                .join(' · ') || variant.id}
            </option>
          ))}
        </select>
        {errors.variantOrName ? <small className="field-error">{errors.variantOrName}</small> : null}
      </label>

      <label>
        Product Name (optional)
        <input
          suppressHydrationWarning
          ref={customProductNameRef}
          value={customProductName}
          onChange={(e) => setCustomProductName(e.target.value)}
          placeholder={selectedBrandName ? `${selectedBrandName} 12 Years` : 'e.g. Macallan 18 Sherry Oak'}
        />
        {errors.variantOrName ? <small className="field-error">{errors.variantOrName}</small> : null}
      </label>

      <label>
        Purchase Price (KRW)
        <input
          suppressHydrationWarning
          ref={purchasePriceRef}
          type="number"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          placeholder="350000"
          required
        />
        {errors.purchasePrice ? <small className="field-error">{errors.purchasePrice}</small> : null}
      </label>

      <label>
        Purchase Date
        <input suppressHydrationWarning ref={purchaseDateRef} type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
        {errors.purchaseDate ? <small className="field-error">{errors.purchaseDate}</small> : null}
      </label>

      <label className="inline-check">
        <input suppressHydrationWarning type="checkbox" checked={boxAvailable} onChange={(e) => setBoxAvailable(e.target.checked)} />
        Box available
      </label>

      <label>
        Photo URL
        <input suppressHydrationWarning value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
      </label>
      <label>
        Or Upload Photo
        <input suppressHydrationWarning type="file" accept="image/*" onChange={onPhotoFileChange} />
      </label>
      {photoUrl ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="feed-image" src={photoUrl} alt="Preview" />
          <button className="btn ghost" type="button" onClick={() => setPhotoUrl('')}>
            Remove Photo
          </button>
        </div>
      ) : null}

      <label>
        Caption
        <input suppressHydrationWarning value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a short note for feed" />
      </label>

      <label className="visibility-toggle">
        <span>Public in feed</span>
        <input
          suppressHydrationWarning
          type="checkbox"
          checked={visibility === 'PUBLIC'}
          onChange={(e) => setVisibility(e.target.checked ? 'PUBLIC' : 'PRIVATE')}
        />
      </label>

      <button className="btn primary" type="submit">
        Register Asset
      </button>
      <small>{message}</small>
    </form>
  );
}
