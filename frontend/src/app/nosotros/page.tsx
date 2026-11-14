import { pageMetadata } from '@/lib/seo';
import { AboutExperience } from '@/components/experience/information';

export const metadata = pageMetadata('/nosotros');

export default function Page() {
  return <AboutExperience />;
}
