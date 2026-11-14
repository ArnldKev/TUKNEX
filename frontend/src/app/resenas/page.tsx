import { pageMetadata } from '@/lib/seo';
import { PublicReviews } from '@/components/reviews/public-reviews';
import { PublicShell } from '@/components/experience/public-shell';

export const metadata = pageMetadata('/resenas');

export default function ReviewsPage() {
  return (
    <PublicShell>
      <PublicReviews />
    </PublicShell>
  );
}
