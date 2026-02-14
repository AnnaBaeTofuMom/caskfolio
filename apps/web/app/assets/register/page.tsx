'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const AssetForm = dynamic(() => import('../../../components/assets/asset-form').then((mod) => mod.AssetForm), {
  ssr: false
});

export default function AssetRegisterPage() {
  return (
    <section>
      <Link className="sub" href="/assets">
        ← Back to My Assets
      </Link>
      <h1>Register New Asset</h1>
      <p className="sub">Add a bottle to your assets.</p>
      <AssetForm />
    </section>
  );
}
