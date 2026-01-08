import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { SettingsPage } from '@/components/settings-page';

export default async function Settings() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const settings = await getSettings(session.username);

  return <SettingsPage session={session} initialSettings={settings} />;
}
