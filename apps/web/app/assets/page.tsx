export default function AssetsPage() {
  return (
    <section>
      <h1>Asset Registration</h1>
      <form className="card form-grid">
        <label>
          Brand
          <input placeholder="Search distillery" />
        </label>
        <label>
          Product Line
          <input placeholder="Search product" />
        </label>
        <label>
          Variant
          <input placeholder="Release / Year / Size" />
        </label>
        <label>
          Custom Product Name
          <input placeholder="If not found" />
        </label>
        <button className="btn primary" type="submit">
          Register Asset
        </button>
      </form>
    </section>
  );
}
