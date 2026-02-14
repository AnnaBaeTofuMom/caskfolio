'use client';

import { FormEvent, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

type AdminUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: 'USER' | 'ADMIN';
};

export function AdminOpsPanel({ users }: { users: AdminUser[] }) {
  const [runtimeUsers, setRuntimeUsers] = useState<AdminUser[]>(users);
  const [status, setStatus] = useState('');
  const [roleUserId, setRoleUserId] = useState(users[0]?.id ?? '');
  const [role, setRole] = useState<'USER' | 'ADMIN'>(users[0]?.role ?? 'USER');
  const [brandId, setBrandId] = useState('');
  const [brandName, setBrandName] = useState('');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [variantId, setVariantId] = useState('');
  const [variantRegion, setVariantRegion] = useState('');
  const [lowestPrice, setLowestPrice] = useState('');
  const [highestPrice, setHighestPrice] = useState('');
  const [priceVariantId, setPriceVariantId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  async function fetchUsers() {
    const token = window.localStorage.getItem('caskfolio_access_token');
    if (!token) return;
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return;
    const data = (await response.json()) as AdminUser[];
    setRuntimeUsers(data);
    if (!roleUserId && data[0]) {
      setRoleUserId(data[0].id);
      setRole(data[0].role);
    }
  }

  useEffect(() => {
    if (runtimeUsers.length === 0) {
      void fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(path: string, method: 'POST' | 'PATCH', body?: Record<string, unknown>) {
    const token = window.localStorage.getItem('caskfolio_access_token');
    if (!token) {
      throw new Error('missing token');
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
  }

  async function onRoleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('Updating user role...');
    try {
      await send(`/admin/users/${roleUserId}/role`, 'PATCH', { role });
      setStatus('User role updated.');
    } catch {
      setStatus('Role update failed.');
    }
  }

  async function onBrandUpdate(event: FormEvent) {
    event.preventDefault();
    setStatus('Updating brand...');
    try {
      await send(`/admin/catalog/brands/${brandId}`, 'PATCH', { name: brandName });
      setStatus('Brand updated.');
    } catch {
      setStatus('Brand update failed.');
    }
  }

  async function onBrandDelete() {
    setStatus('Deleting brand...');
    try {
      await send(`/admin/catalog/brands/${brandId}/delete`, 'POST');
      setStatus('Brand deleted.');
    } catch {
      setStatus('Brand delete failed.');
    }
  }

  async function onProductUpdate(event: FormEvent) {
    event.preventDefault();
    setStatus('Updating product...');
    try {
      await send(`/admin/catalog/products/${productId}`, 'PATCH', { name: productName });
      setStatus('Product updated.');
    } catch {
      setStatus('Product update failed.');
    }
  }

  async function onProductDelete() {
    setStatus('Deleting product...');
    try {
      await send(`/admin/catalog/products/${productId}/delete`, 'POST');
      setStatus('Product deleted.');
    } catch {
      setStatus('Product delete failed.');
    }
  }

  async function onVariantUpdate(event: FormEvent) {
    event.preventDefault();
    setStatus('Updating variant...');
    try {
      await send(`/admin/catalog/variants/${variantId}`, 'PATCH', { region: variantRegion });
      setStatus('Variant updated.');
    } catch {
      setStatus('Variant update failed.');
    }
  }

  async function onVariantDelete() {
    setStatus('Deleting variant...');
    try {
      await send(`/admin/catalog/variants/${variantId}/delete`, 'POST');
      setStatus('Variant deleted.');
    } catch {
      setStatus('Variant delete failed.');
    }
  }

  async function onManualPrice(event: FormEvent) {
    event.preventDefault();
    setStatus('Saving manual market price...');
    try {
      await send('/admin/market-price', 'POST', {
        variantId: priceVariantId,
        lowestPrice: Number(lowestPrice),
        highestPrice: Number(highestPrice),
        source: 'admin_manual',
        sourceUrl: sourceUrl || undefined
      });
      setStatus('Manual market price saved.');
    } catch {
      setStatus('Manual market price save failed.');
    }
  }

  return (
    <article className="card">
      <h2>Admin Operations</h2>
      <div className="grid">
        <form suppressHydrationWarning className="card form-grid" onSubmit={onRoleSubmit}>
          <h3>User Role</h3>
          <label>
            User
            <select suppressHydrationWarning value={roleUserId} onChange={(e) => setRoleUserId(e.target.value)}>
              {runtimeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  @{user.username} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <label>
            Role
            <select suppressHydrationWarning value={role} onChange={(e) => setRole(e.target.value as 'USER' | 'ADMIN')}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <button className="btn primary" type="submit">
            Update Role
          </button>
        </form>

        <form suppressHydrationWarning className="card form-grid" onSubmit={onManualPrice}>
          <h3>Manual Price Snapshot</h3>
          <label>
            Variant ID
            <input suppressHydrationWarning value={priceVariantId} onChange={(e) => setPriceVariantId(e.target.value)} required />
          </label>
          <label>
            Lowest Price
            <input suppressHydrationWarning type="number" value={lowestPrice} onChange={(e) => setLowestPrice(e.target.value)} required />
          </label>
          <label>
            Highest Price
            <input suppressHydrationWarning type="number" value={highestPrice} onChange={(e) => setHighestPrice(e.target.value)} required />
          </label>
          <label>
            Source URL (optional)
            <input suppressHydrationWarning value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          </label>
          <button className="btn primary" type="submit">
            Save Snapshot
          </button>
        </form>

        <form suppressHydrationWarning className="card form-grid" onSubmit={onBrandUpdate}>
          <h3>Brand Update/Delete</h3>
          <label>
            Brand ID
            <input suppressHydrationWarning value={brandId} onChange={(e) => setBrandId(e.target.value)} required />
          </label>
          <label>
            New Name
            <input suppressHydrationWarning value={brandName} onChange={(e) => setBrandName(e.target.value)} required />
          </label>
          <button className="btn primary" type="submit">
            Update Brand
          </button>
          <button className="btn ghost" type="button" onClick={onBrandDelete}>
            Delete Brand
          </button>
        </form>

        <form suppressHydrationWarning className="card form-grid" onSubmit={onProductUpdate}>
          <h3>Product Update/Delete</h3>
          <label>
            Product ID
            <input suppressHydrationWarning value={productId} onChange={(e) => setProductId(e.target.value)} required />
          </label>
          <label>
            New Name
            <input suppressHydrationWarning value={productName} onChange={(e) => setProductName(e.target.value)} required />
          </label>
          <button className="btn primary" type="submit">
            Update Product
          </button>
          <button className="btn ghost" type="button" onClick={onProductDelete}>
            Delete Product
          </button>
        </form>

        <form suppressHydrationWarning className="card form-grid" onSubmit={onVariantUpdate}>
          <h3>Variant Update/Delete</h3>
          <label>
            Variant ID
            <input suppressHydrationWarning value={variantId} onChange={(e) => setVariantId(e.target.value)} required />
          </label>
          <label>
            Region
            <input suppressHydrationWarning value={variantRegion} onChange={(e) => setVariantRegion(e.target.value)} required />
          </label>
          <button className="btn primary" type="submit">
            Update Variant
          </button>
          <button className="btn ghost" type="button" onClick={onVariantDelete}>
            Delete Variant
          </button>
        </form>
      </div>
      <small>{status}</small>
    </article>
  );
}
