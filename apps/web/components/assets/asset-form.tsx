'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Brand = { id: string; name: string };
type Product = { id: string; name: string; brandId: string };
type Variant = { id: string; releaseYear: number | null; bottleSize: number | null; region: string | null; specialTag: string | null };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export function AssetForm() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [brandId, setBrandId] = useState('');
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

  const selectedVariantLabel = useMemo(() => {
    const selected = variants.find((v) => v.id === variantId);
    if (!selected) return '';
    return [selected.releaseYear, selected.bottleSize ? `${selected.bottleSize}ml` : null, selected.region, selected.specialTag]
      .filter(Boolean)
      .join(' · ');
  }, [variantId, variants]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('Saving...');

    const body = {
      variantId: variantId || undefined,
      customProductName: customProductName || undefined,
      purchasePrice: Number(purchasePrice),
      purchaseDate,
      bottleCondition: 'SEALED',
      boxAvailable,
      storageLocation: 'HOME',
      photoUrl: photoUrl || undefined,
      caption: caption || undefined,
      visibility
    };

    const res = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'demo@caskfolio.com'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      setMessage('Failed to register asset');
      return;
    }

    setMessage('Asset registered');
    setVariantId('');
    setCustomProductName('');
    setPurchasePrice('');
    setPurchaseDate('');
    setBoxAvailable(false);
    setPhotoUrl('');
    setCaption('');
    setVisibility('PUBLIC');
  }

  return (
    <form className="card form-grid" onSubmit={onSubmit}>
      <label>
        Brand
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
          <option value="">Select brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Product Line
        <select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!brandId}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Variant
        <select value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!productId}>
          <option value="">Select variant</option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {[variant.releaseYear, variant.bottleSize ? `${variant.bottleSize}ml` : null, variant.region, variant.specialTag]
                .filter(Boolean)
                .join(' · ') || variant.id}
            </option>
          ))}
        </select>
      </label>

      {selectedVariantLabel ? <small>{selectedVariantLabel}</small> : null}

      <label>
        Custom Product Name
        <input value={customProductName} onChange={(e) => setCustomProductName(e.target.value)} placeholder="If not found" />
      </label>

      <label>
        Purchase Price (KRW)
        <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="350000" required />
      </label>

      <label>
        Purchase Date
        <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
      </label>

      <label className="inline-check">
        <input type="checkbox" checked={boxAvailable} onChange={(e) => setBoxAvailable(e.target.checked)} />
        Box available
      </label>

      <label>
        Photo URL
        <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
      </label>

      <label>
        Caption
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a short note for feed" />
      </label>

      <label>
        Visibility
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'PUBLIC')}>
          <option value="PUBLIC">Public (show in feed)</option>
          <option value="PRIVATE">Private</option>
        </select>
      </label>

      <button className="btn primary" type="submit">
        Register Asset
      </button>
      <small>{message}</small>
    </form>
  );
}
