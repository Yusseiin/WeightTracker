import { cookies } from 'next/headers';
import { WeightTracker } from '@/components/weight-tracker';
import { getEntries, getSettings } from '@/lib/data';
import { getTodayWater, getWaterEntries } from '@/lib/water';
import { SESSION_COOKIE_NAME, SessionUser } from '@/lib/types';

export default async function Home() {
  // Get session from cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  let session: SessionUser | null = null;
  try {
    if (sessionCookie?.value) {
      session = JSON.parse(sessionCookie.value);
    }
  } catch {
    session = null;
  }

  // Use username as userId for data fetching
  const userId = session?.username || 'default';

  // Server-side data fetching
  const entries = await getEntries(userId);
  const settings = await getSettings(userId);
  const todayWater = await getTodayWater(userId);
  const waterEntries = await getWaterEntries(userId);

  return (
    <div className="h-[80vh] bg-background flex flex-col">
      <WeightTracker
        initialEntries={entries}
        initialSettings={settings}
        initialWater={todayWater}
        initialWaterEntries={waterEntries}
        session={session}
      />
    </div>
  );
}
