// @ts-nocheck
import { useListAdminReviews, useUpdateAdminReviewStatus } from '@workspace/api-client-react';
import { Star } from 'lucide-react';
import { CatalogPage } from './catalog-page';
import { Badge, Cell, day, val } from './page-shared';

export function ReviewsPage() {
  const query = useListAdminReviews();
  const mutation = useUpdateAdminReviewStatus();
  return (
    <CatalogPage
      title="Reviews"
      description="Moderate guest feedback with the original rating, author, and state intact."
      query={query}
      heads={['Review', 'Rating', 'Entity', 'Submitted', 'Status', 'Action']}
      render={(review: any) => (
        <>
          <Cell>
            <p className="font-semibold">{val(review.title, 'Untitled review')}</p>
            <p className="max-w-[300px] truncate text-xs text-muted-foreground">{val(review.body, 'No written comment')}</p>
            <p className="text-xs">{val(review.userName, 'Anonymous')}</p>
          </Cell>
          <Cell>
            <span className="flex items-center gap-1 font-semibold">
              <Star size={14} className="fill-accent" /> {review.rating}
            </span>
          </Cell>
          <Cell className="text-xs">{review.entityType} · {review.entityId}</Cell>
          <Cell className="text-muted-foreground">{day(review.createdAt)}</Cell>
          <Cell><Badge value={review.status} /></Cell>
          <Cell>
            <select
              data-testid={`select-review-status-${review.id}`}
              value={review.status}
              onChange={(event) =>
                mutation.mutate({ id: review.id, data: { status: event.target.value, reason: null } })
              }
              className="rounded-md border border-border bg-card px-2 py-1.5 text-xs"
            >
              <option value="pending">pending</option>
              <option value="published">published</option>
              <option value="rejected">rejected</option>
            </select>
          </Cell>
        </>
      )}
    />
  );
}