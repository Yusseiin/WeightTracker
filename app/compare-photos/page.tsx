import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ComparePhotosPage } from '@/components/compare-photos-page';

export default async function ComparePhotos() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <ComparePhotosPage />;
}
