import { cookies } from 'next/headers';
import { WeightTracker } from '@/components/weight-tracker';
import { getEntries, getSettings } from '@/lib/data';
import { getTodayWater, getWaterEntries } from '@/lib/water';
import { getTodaySteps, getStepsEntries } from '@/lib/steps';
import { getTodayPressure, getPressureEntries } from '@/lib/pressure';
import { getTodayMedications, getMedicationEntries } from '@/lib/medication';
import { getInjectionEntries, getLastInjection } from '@/lib/injections';
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
  const todaySteps = await getTodaySteps(userId);
  const stepsEntries = await getStepsEntries(userId);
  const todayPressure = await getTodayPressure(userId);
  const pressureEntries = await getPressureEntries(userId);
  const todayMedications = await getTodayMedications(userId);
  const medicationEntries = await getMedicationEntries(userId);
  const injectionEntries = await getInjectionEntries(userId);
  const lastInjection = await getLastInjection(userId);

  return (
    <div className="h-screen bg-background flex flex-col">
      <WeightTracker
        initialEntries={entries}
        initialSettings={settings}
        initialWater={todayWater}
        initialWaterEntries={waterEntries}
        initialTodaySteps={todaySteps}
        initialStepsEntries={stepsEntries}
        initialTodayPressure={todayPressure}
        initialPressureEntries={pressureEntries}
        initialTodayMedications={todayMedications}
        initialMedicationEntries={medicationEntries}
        initialInjectionEntries={injectionEntries}
        initialLastInjection={lastInjection}
        session={session}
      />
    </div>
  );
}
