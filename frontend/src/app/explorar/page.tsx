import { pageMetadata } from '@/lib/seo';
import { ExploreExperience } from '@/components/experience/explore';

export const metadata = pageMetadata('/explorar');

export default function Page() {
  return <ExploreExperience />;
}
