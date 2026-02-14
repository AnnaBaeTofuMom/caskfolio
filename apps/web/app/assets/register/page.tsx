import Link from 'next/link';
import { AssetForm } from '../../../components/assets/asset-form';

export default function AssetRegisterPage() {
  return (
    <section>
      <Link className="sub" href="/assets">
        ← Back to Assets
      </Link>
      <h1>Register New Asset</h1>
      <p className="sub">Add a bottle to your collection.</p>
      <AssetForm />
    </section>
  );
}
