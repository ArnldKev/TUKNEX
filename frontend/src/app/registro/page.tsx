import { pageMetadata } from '@/lib/seo';
import { AuthScreen } from '@/components/auth/auth-screen';

export const metadata = pageMetadata('/registro');

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
