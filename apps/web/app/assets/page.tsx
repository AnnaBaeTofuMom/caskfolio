import { AssetForm } from '../../components/assets/asset-form';
import { MyAssetsPanel } from '../../components/assets/my-assets-panel';

export default function AssetsPage() {
  return (
    <section>
      <h1>Asset Registration</h1>
      <div className="grid">
        <AssetForm />
        <MyAssetsPanel />
      </div>
    </section>
  );
}
