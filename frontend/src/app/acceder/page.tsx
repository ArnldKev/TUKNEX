import { pageMetadata } from '@/lib/seo';
import { AuthScreen } from '@/components/auth/auth-screen';

export const metadata = pageMetadata('/acceder');

export default function AccessPage() {
  return <AuthScreen />;
}
