"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WeightChart } from '@/components/weight-chart';
import { AddEntryDialog } from '@/components/add-entry-dialog';
import { AddWaterDialog } from '@/components/add-water-dialog';
import { AddStepsDialog } from '@/components/add-steps-dialog';
import { AddPressureDialog } from '@/components/add-pressure-dialog';
import { AddMedicationDialog } from '@/components/add-medication-dialog';
import { AddInjectionDialog } from '@/components/add-injection-dialog';
import { FloatingButtonBar } from '@/components/floating-button-bar';
import { EntriesTable } from '@/components/entries-table';
import { EditEntryDialog } from '@/components/edit-entry-dialog';
import { SettingsButton } from '@/components/settings-popup';
import { TodayRecap } from '@/components/today-recap';
import { useWeightEntries } from '@/hooks/use-weight-entries';
import { useWater } from '@/hooks/use-water';
import { useSteps } from '@/hooks/use-steps';
import { usePressure } from '@/hooks/use-pressure';
import { useMedications } from '@/hooks/use-medications';
import { useInjections } from '@/hooks/use-injections';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WeightEntry, UserSettings, SessionUser, WaterDayTotal, WaterEntry, StepsEntry, PressureEntry, MedicationEntry, InjectionEntry } from '@/lib/types';
import { ChangelogDialog } from './changelog-dialog';
import { MotivationalQuote } from './motivational-quote';
import { MedicationReminderBanner } from './medication-reminder-banner';
import { Button } from './ui/button';
import { Info } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

// localStorage key that remembers which version's changelog the user has already seen
const CHANGELOG_SEEN_KEY = 'changelog-seen-version';

interface WeightTrackerProps {
  initialEntries: WeightEntry[];
  initialSettings: UserSettings;
  initialWater: WaterDayTotal | null;
  initialWaterEntries: WaterDayTotal[];
  initialWaterInserts: WaterEntry[];
  initialTodaySteps: StepsEntry[];
  initialStepsEntries: StepsEntry[];
  initialTodayPressure: PressureEntry[];
  initialPressureEntries: PressureEntry[];
  initialTodayMedications: MedicationEntry[];
  initialMedicationEntries: MedicationEntry[];
  initialInjectionEntries: InjectionEntry[];
  initialLastInjection: InjectionEntry | null;
  session: SessionUser | null;
}

export function WeightTracker({
  initialEntries,
  initialSettings,
  initialWater,
  initialWaterEntries,
  initialWaterInserts,
  initialTodaySteps,
  initialStepsEntries,
  initialTodayPressure,
  initialPressureEntries,
  initialTodayMedications,
  initialMedicationEntries,
  initialInjectionEntries,
  initialLastInjection,
  session
}: WeightTrackerProps) {
  const {
    entries,
    settings,
    addEntry,
    updateEntry,
    deleteEntry,
    updateSettings
  } = useWeightEntries(initialEntries, initialSettings);

  const {
    todayWater,
    waterEntries,
    waterInserts,
    isLoading: isWaterLoading,
    addWater,
    resetWater,
    updateWater,
    createWaterEntry,
    updateWaterById,
    deleteWaterById
  } = useWater(initialWater, initialWaterEntries, settings.goals?.dailyWaterGoal, initialWaterInserts);

  const {
    todaySteps,
    stepsEntries,
    isLoading: isStepsLoading,
    createSteps,
    updateStepsById,
    deleteSteps
  } = useSteps(initialTodaySteps, initialStepsEntries);

  const {
    todayPressure,
    pressureEntries,
    isLoading: isPressureLoading,
    createPressure,
    updatePressureById,
    deletePressure
  } = usePressure(initialTodayPressure, initialPressureEntries);

  const {
    todayMedications,
    medicationEntries,
    isLoading: isMedicationLoading,
    createMedication,
    updateMedicationById,
    deleteMedication
  } = useMedications(initialTodayMedications, initialMedicationEntries);

  const {
    injectionEntries,
    lastInjection,
    isLoading: isInjectionLoading,
    createInjection,
    updateInjectionById,
    deleteInjection
  } = useInjections(initialInjectionEntries, initialLastInjection);

  const router = useRouter();
  const { t } = useTranslation();

  // Get feature toggles with defaults
  const features = settings.features || { waterEnabled: true, waterHistoryEnabled: false, stepsEnabled: false, pressureEnabled: false, medicationEnabled: false, injectionsEnabled: false, photosEnabled: false, bodyFatEnabled: false, bodyMeasurementsEnabled: false };

  const [selectedEntry, setSelectedEntry] = useState<WeightEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#history') return 'history';
    return 'chart';
  });
  const [changelogOpen, setChangelogOpen] = useState(false);

  // Auto-open the changelog once after each version update
  useEffect(() => {
    const currentVersion = process.env.NEXT_PUBLIC_VERSION;
    if (!currentVersion) return;
    const seenVersion = window.localStorage.getItem(CHANGELOG_SEEN_KEY);
    if (seenVersion === null) {
      // Fresh install: record the current version without showing the popup
      window.localStorage.setItem(CHANGELOG_SEEN_KEY, currentVersion);
    } else if (seenVersion !== currentVersion) {
      // Version changed since last visit: show the new changelog
      setChangelogOpen(true);
    }
  }, []);

  // Remember this version as seen once the dialog is dismissed, so it won't
  // auto-open again until the next release
  const handleChangelogOpenChange = (open: boolean) => {
    setChangelogOpen(open);
    if (!open && process.env.NEXT_PUBLIC_VERSION) {
      window.localStorage.setItem(CHANGELOG_SEEN_KEY, process.env.NEXT_PUBLIC_VERSION);
    }
  };

  // Dialog open states for floating button bar
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [waterDialogOpen, setWaterDialogOpen] = useState(false);
  const [stepsDialogOpen, setStepsDialogOpen] = useState(false);
  const [pressureDialogOpen, setPressureDialogOpen] = useState(false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [injectionDialogOpen, setInjectionDialogOpen] = useState(false);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);

  const handleRowClick = (entry: WeightEntry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const handleUpdateNextRotation = async (medicationId: string, siteId: string) => {
    const currentInjectionSettings = settings.injectionSettings || {
      medications: [],
      injectionSites: [],
    };
    const currentOverrides = currentInjectionSettings.nextRotationOverrides || {};
    await updateSettings({
      injectionSettings: {
        ...currentInjectionSettings,
        nextRotationOverrides: {
          ...currentOverrides,
          [medicationId]: siteId,
        },
      },
    });
  };

  return (
    <>
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-12 items-center justify-between px-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt={t('dashboard.header.logoAlt')} className="h-6 w-6" />
            <h1 className="text-lg font-semibold">{t('dashboard.header.title')}</h1>
            {session && (
              <span className="text-sm text-muted-foreground">
                ({session.nickname})
              </span>
            )}
          </div>
          {session && <div><Button
            variant="ghost"
            size="icon"
            onClick={() => setChangelogOpen(true)}
            title={t('nav.changelog')}
            className="cursor-pointer"
          >
            <Info className="h-5 w-5" />
          </Button>
          <SettingsButton /> </div>}
          
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-1 pb-18 space-y-1 max-w-3xl mx-auto flex-1 overflow-hidden flex flex-col">
        {settings.showQuotes !== false && <MotivationalQuote />}

        {/* Medication Reminder Banner - show if medication feature is enabled */}
        {features.medicationEnabled && (
          <MedicationReminderBanner
            medicationPresets={settings.medicationPresets || []}
            todayMedications={todayMedications}
            onOpenMedicationDialog={() => setMedicationDialogOpen(true)}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full grid grid-cols-2 shrink-0">
            <TabsTrigger value="chart">{t('nav.chart')}</TabsTrigger>
            <TabsTrigger value="history">{t('nav.history')}</TabsTrigger>
          </TabsList>

          {/* Today's Recap - only show on chart view */}
          {activeTab === 'chart' && (
            <TodayRecap
              entries={entries}
              todayWater={todayWater}
              unit={settings.unit}
              waterUnit={settings.waterUnit || 'ml'}
              goals={settings.goals}
              waterEntries={waterEntries}
              todaySteps={todaySteps}
              todayPressure={todayPressure}
              todayMedications={todayMedications}
              medicationPresets={settings.medicationPresets || []}
              features={features}
              injectionEntries={injectionEntries}
              injectionSettings={settings.injectionSettings}
              dateFormat={settings.dateFormat}
            />
          )}

          <TabsContent value="chart" className="mt-0 flex-1 overflow-hidden">
            {/* Weight Chart */}
            <WeightChart
              entries={entries}
              targetWeight={settings.targetWeight}
              unit={settings.unit}
              chartColor={settings.chartColor}
              dateFormat={settings.dateFormat}
              waterEntries={waterEntries}
              waterUnit={settings.waterUnit || 'ml'}
              stepsEntries={stepsEntries}
              pressureEntries={pressureEntries}
              medicationEntries={medicationEntries}
              medicationPresets={settings.medicationPresets || []}
              features={features}
              goals={settings.goals}
              injectionEntries={injectionEntries}
              injectionSettings={settings.injectionSettings}
              chartCombinations={settings.chartCombinations}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0 flex-1 overflow-auto">
            {/* Entries Table */}
            <EntriesTable
              entries={entries}
              unit={settings.unit}
              waterUnit={settings.waterUnit || 'ml'}
              onRowClick={handleRowClick}
              waterEntries={waterEntries}
              waterInserts={waterInserts}
              onUpdateWater={features.waterHistoryEnabled ? updateWaterById : undefined}
              onDeleteWater={features.waterHistoryEnabled ? deleteWaterById : undefined}
              stepsEntries={stepsEntries}
              pressureEntries={pressureEntries}
              medicationEntries={medicationEntries}
              medicationPresets={settings.medicationPresets || []}
              dateFormat={settings.dateFormat}
              activities={settings.activities}
              features={features}
              photosEnabled={features.photosEnabled}
              photoRefreshKey={photoRefreshKey}
              onUpdateSteps={features.stepsEnabled ? updateStepsById : undefined}
              onDeleteSteps={features.stepsEnabled ? deleteSteps : undefined}
              onUpdatePressure={features.pressureEnabled ? updatePressureById : undefined}
              onDeletePressure={features.pressureEnabled ? deletePressure : undefined}
              onUpdateMedication={features.medicationEnabled ? updateMedicationById : undefined}
              onDeleteMedication={features.medicationEnabled ? deleteMedication : undefined}
              injectionEntries={injectionEntries}
              injectionSettings={settings.injectionSettings}
              onUpdateInjection={features.injectionsEnabled ? updateInjectionById : undefined}
              onDeleteInjection={features.injectionsEnabled ? deleteInjection : undefined}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Entry Dialog */}
      <EditEntryDialog
        entry={selectedEntry}
        open={editDialogOpen}
        onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setPhotoRefreshKey(k => k + 1); }}
        onSave={updateEntry}
        onDelete={deleteEntry}
        unit={settings.unit}
        waterUnit={settings.waterUnit || 'ml'}
        waterEntries={waterEntries}
        onUpdateWater={updateWater}
        activities={settings.activities}
        photosEnabled={features.photosEnabled}
        notesEnabled={features.weightNotesEnabled}
        bodyFatEnabled={features.bodyFatEnabled}
        waterHistoryEnabled={features.waterHistoryEnabled}
        dateFormat={settings.dateFormat}
      />

      {/* Floating Button Bar */}
      <FloatingButtonBar
        onWeightClick={() => setWeightDialogOpen(true)}
        onWaterClick={features.waterEnabled ? () => setWaterDialogOpen(true) : () => {}}
        onStepsClick={features.stepsEnabled ? () => setStepsDialogOpen(true) : undefined}
        onPressureClick={features.pressureEnabled ? () => setPressureDialogOpen(true) : undefined}
        onMedicationClick={features.medicationEnabled ? () => setMedicationDialogOpen(true) : undefined}
        onInjectionClick={features.injectionsEnabled ? () => setInjectionDialogOpen(true) : undefined}
        onBodyMeasurementsClick={features.bodyMeasurementsEnabled ? () => router.push('/body-measurements') : undefined}
        features={features}
      />

      {/* Add Entry Dialog/Drawer */}
      <AddEntryDialog
        onSubmit={addEntry}
        unit={settings.unit}
        activities={settings.activities}
        photosEnabled={features.photosEnabled}
        notesEnabled={features.weightNotesEnabled}
        bodyFatEnabled={features.bodyFatEnabled}
        open={weightDialogOpen}
        onOpenChange={(open) => { setWeightDialogOpen(open); if (!open) setPhotoRefreshKey(k => k + 1); }}
      />

      {/* Add Water Dialog/Drawer - only show if enabled */}
      {features.waterEnabled && (
        <AddWaterDialog
          todayWater={todayWater}
          onAddWater={addWater}
          onResetWater={resetWater}
          isLoading={isWaterLoading}
          waterUnit={settings.waterUnit || 'ml'}
          waterPresets={settings.waterPresets}
          open={waterDialogOpen}
          onOpenChange={setWaterDialogOpen}
          historyEnabled={features.waterHistoryEnabled}
          onAddWaterEntry={createWaterEntry}
        />
      )}

      {/* Add Steps Dialog/Drawer - only show if enabled */}
      {features.stepsEnabled && (
        <AddStepsDialog
          onAddSteps={createSteps}
          isLoading={isStepsLoading}
          photosEnabled={features.photosEnabled}
          notesEnabled={features.stepsNotesEnabled}
          open={stepsDialogOpen}
          onOpenChange={(open) => { setStepsDialogOpen(open); if (!open) setPhotoRefreshKey(k => k + 1); }}
        />
      )}

      {/* Add Pressure Dialog/Drawer - only show if enabled */}
      {features.pressureEnabled && (
        <AddPressureDialog
          onAddPressure={createPressure}
          isLoading={isPressureLoading}
          photosEnabled={features.photosEnabled}
          notesEnabled={features.pressureNotesEnabled}
          open={pressureDialogOpen}
          onOpenChange={(open) => { setPressureDialogOpen(open); if (!open) setPhotoRefreshKey(k => k + 1); }}
        />
      )}

      {/* Add Medication Dialog/Drawer - only show if enabled */}
      {features.medicationEnabled && (
        <AddMedicationDialog
          medicationPresets={settings.medicationPresets || []}
          todayMedications={todayMedications}
          onToggleMedication={createMedication}
          onDeleteMedication={deleteMedication}
          isLoading={isMedicationLoading}
          photosEnabled={features.photosEnabled}
          notesEnabled={features.medicationNotesEnabled}
          open={medicationDialogOpen}
          onOpenChange={(open) => { setMedicationDialogOpen(open); if (!open) setPhotoRefreshKey(k => k + 1); }}
        />
      )}

      {/* Add Injection Dialog/Drawer - only show if enabled */}
      {features.injectionsEnabled && (
        <AddInjectionDialog
          medications={settings.injectionSettings?.medications || []}
          injectionSites={settings.injectionSettings?.injectionSites || []}
          injectionEntries={injectionEntries}
          onAddInjection={createInjection}
          isLoading={isInjectionLoading}
          photosEnabled={features.photosEnabled}
          notesEnabled={features.injectionNotesEnabled}
          open={injectionDialogOpen}
          onOpenChange={(open) => { setInjectionDialogOpen(open); if (!open) setPhotoRefreshKey(k => k + 1); }}
          onUpdateNextRotation={handleUpdateNextRotation}
          nextRotationOverrides={settings.injectionSettings?.nextRotationOverrides || {}}
        />
      )}

      <ChangelogDialog open={changelogOpen} onOpenChange={handleChangelogOpenChange} />
    </>
  );
}
