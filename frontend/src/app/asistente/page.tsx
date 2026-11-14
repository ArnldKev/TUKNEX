import { pageMetadata } from '@/lib/seo';
import { AssistantExperience } from '@/components/experience/information';

export const metadata = pageMetadata('/asistente');

export default function Page() {
  return <AssistantExperience />;
}
