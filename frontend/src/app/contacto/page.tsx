import { pageMetadata } from '@/lib/seo';
import { ContactExperience } from '@/components/experience/information';

export const metadata = pageMetadata('/contacto');

export default function Page() {
  return <ContactExperience />;
}
