interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;

  return (
    <section>
      <h1>@{username}</h1>
      <p className="sub">Public whisky collection</p>
      <div className="grid">
        <article className="card">
          <h3>Yamazaki 18</h3>
          <p>Trusted Price: 1,050,000 KRW</p>
        </article>
      </div>
    </section>
  );
}
