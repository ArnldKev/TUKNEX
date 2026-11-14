import { pageMetadata } from '@/lib/seo';
import { ProjectsExperience } from '@/components/experience/projects';

export const metadata = pageMetadata('/proyectos');

export default function Page() {
  return <ProjectsExperience />;
}
