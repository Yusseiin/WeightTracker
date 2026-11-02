import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { ApiTokensPage } from '@/components/api-tokens-page';

// Scoped API token management - admins only.
export default async function ApiTokens() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }
  if (session.role !== 'admin') {
    redirect('/settings');
  }

  const settings = await getSettings(session.username);

  return <ApiTokensPage dateFormat={settings.dateFormat} />;
}
