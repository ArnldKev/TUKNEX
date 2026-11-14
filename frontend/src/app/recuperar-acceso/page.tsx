import { pageMetadata } from '@/lib/seo';
import { AuthScreen } from '@/components/auth/auth-screen';

export const metadata = pageMetadata('/recuperar-acceso');

export default function RecoverPage() {
  return <AuthScreen mode="reset" />;
}
