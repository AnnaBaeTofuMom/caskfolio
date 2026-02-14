import { FeedCard } from '@caskfolio/types';

export function FeedCardItem({ card }: { card: FeedCard }) {
  return (
    <article className="card feed-card">
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="feed-image" src={card.imageUrl} alt={card.title} />
      ) : null}
      <div className="meta">
        <strong>@{card.owner.username}</strong>
        <span>{new Date(card.createdAt).toLocaleDateString()}</span>
      </div>
      <h3>{card.title}</h3>
      {card.caption ? <p>{card.caption}</p> : null}
      <div className="price-row">
        <span>Trusted Price</span>
        <strong>{card.trustedPrice ? `${card.trustedPrice.toLocaleString()} KRW` : 'Hidden'}</strong>
      </div>
      <small>
        {card.priceMethod} · confidence {(card.confidence * 100).toFixed(0)}%
      </small>
    </article>
  );
}
