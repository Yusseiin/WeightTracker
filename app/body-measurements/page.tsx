import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { getBodyMeasurements } from '@/lib/body-measurements';
import { BodyMeasurementsPage } from '@/components/body-measurements-page';

export default async function BodyMeasurements() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const settings = await getSettings(session.username);

  if (!settings.features.bodyMeasurementsEnabled) {
    redirect('/');
  }

  const entries = await getBodyMeasurements(session.username);

  return (
    <BodyMeasurementsPage
      initialEntries={entries}
      initialPresets={settings.bodyMeasurementPresets}
      initialUnit={settings.measurementUnit}
      photosEnabled={settings.features.photosEnabled}
    />
  );
}
