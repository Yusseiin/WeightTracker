"use client";

import { useState } from 'react';
import { WeightChart } from '@/components/weight-chart';
import { AddEntryDialog } from '@/components/add-entry-dialog';
import { AddWaterDialog } from '@/components/add-water-dialog';
import { AddStepsDialog } from '@/components/add-steps-dialog';
import { AddPressureDialog } from '@/components/add-pressure-dialog';
import { AddMedicationDialog } from '@/components/add-medication-dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WeightEntry, UserSettings, SessionUser, WaterEntry, StepsEntry, PressureEntry, MedicationEntry } from '@/lib/types';
import { ChangelogDialog } from './changelog-dialog';
import { MotivationalQuote } from './motivational-quote';
import { Button } from './ui/button';
import { Info } from 'lucide-react';

interface WeightTrackerProps {
  initialEntries: WeightEntry[];
  initialSettings: UserSettings;
  initialWater: WaterEntry | null;
  initialWaterEntries: WaterEntry[];
  initialTodaySteps: StepsEntry[];
  initialStepsEntries: StepsEntry[];
  initialTodayPressure: PressureEntry[];
  initialPressureEntries: PressureEntry[];
  initialTodayMedications: MedicationEntry[];
  initialMedicationEntries: MedicationEntry[];
  session: SessionUser | null;
}

export function WeightTracker({
  initialEntries,
  initialSettings,
  initialWater,
  initialWaterEntries,
  initialTodaySteps,
  initialStepsEntries,
  initialTodayPressure,
  initialPressureEntries,
  initialTodayMedications,
  initialMedicationEntries,
  session
}: WeightTrackerProps) {
  const {
    entries,
    settings,
    addEntry,
    updateEntry,
    deleteEntry
  } = useWeightEntries(initialEntries, initialSettings);

  const {
    todayWater,
    waterEntries,
    isLoading: isWaterLoading,
    addWater,
    resetWater,
    updateWater
  } = useWater(initialWater, initialWaterEntries, settings.goals?.dailyWaterGoal);

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

  // Get feature toggles with defaults
  const features = settings.features || { stepsEnabled: false, pressureEnabled: false, medicationEnabled: false };

  const [selectedEntry, setSelectedEntry] = useState<WeightEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('chart');
  const [changelogOpen, setChangelogOpen] = useState(false);

  // Dialog open states for floating button bar
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [waterDialogOpen, setWaterDialogOpen] = useState(false);
  const [stepsDialogOpen, setStepsDialogOpen] = useState(false);
  const [pressureDialogOpen, setPressureDialogOpen] = useState(false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);

  const handleRowClick = (entry: WeightEntry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  return (
    <>
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-12 items-center justify-between px-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Weight Tracker</h1>
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
            title="Changelog"
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full grid grid-cols-2 shrink-0">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
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
              stepsEntries={stepsEntries}
              pressureEntries={pressureEntries}
              medicationEntries={medicationEntries}
              medicationPresets={settings.medicationPresets || []}
              dateFormat={settings.dateFormat}
              activities={settings.activities}
              features={features}
              onUpdateSteps={features.stepsEnabled ? updateStepsById : undefined}
              onDeleteSteps={features.stepsEnabled ? deleteSteps : undefined}
              onUpdatePressure={features.pressureEnabled ? updatePressureById : undefined}
              onDeletePressure={features.pressureEnabled ? deletePressure : undefined}
              onUpdateMedication={features.medicationEnabled ? updateMedicationById : undefined}
              onDeleteMedication={features.medicationEnabled ? deleteMedication : undefined}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Entry Dialog */}
      <EditEntryDialog
        entry={selectedEntry}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={updateEntry}
        onDelete={deleteEntry}
        unit={settings.unit}
        waterUnit={settings.waterUnit || 'ml'}
        waterEntries={waterEntries}
        onUpdateWater={updateWater}
        activities={settings.activities}
      />

      {/* Floating Button Bar */}
      <FloatingButtonBar
        onWeightClick={() => setWeightDialogOpen(true)}
        onWaterClick={() => setWaterDialogOpen(true)}
        onStepsClick={features.stepsEnabled ? () => setStepsDialogOpen(true) : undefined}
        onPressureClick={features.pressureEnabled ? () => setPressureDialogOpen(true) : undefined}
        onMedicationClick={features.medicationEnabled ? () => setMedicationDialogOpen(true) : undefined}
        features={features}
      />

      {/* Add Entry Dialog/Drawer */}
      <AddEntryDialog
        onSubmit={addEntry}
        unit={settings.unit}
        activities={settings.activities}
        open={weightDialogOpen}
        onOpenChange={setWeightDialogOpen}
      />

      {/* Add Water Dialog/Drawer */}
      <AddWaterDialog
        todayWater={todayWater}
        onAddWater={addWater}
        onResetWater={resetWater}
        isLoading={isWaterLoading}
        waterUnit={settings.waterUnit || 'ml'}
        waterPresets={settings.waterPresets}
        open={waterDialogOpen}
        onOpenChange={setWaterDialogOpen}
      />

      {/* Add Steps Dialog/Drawer - only show if enabled */}
      {features.stepsEnabled && (
        <AddStepsDialog
          onAddSteps={createSteps}
          isLoading={isStepsLoading}
          open={stepsDialogOpen}
          onOpenChange={setStepsDialogOpen}
        />
      )}

      {/* Add Pressure Dialog/Drawer - only show if enabled */}
      {features.pressureEnabled && (
        <AddPressureDialog
          onAddPressure={createPressure}
          isLoading={isPressureLoading}
          open={pressureDialogOpen}
          onOpenChange={setPressureDialogOpen}
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
          open={medicationDialogOpen}
          onOpenChange={setMedicationDialogOpen}
        />
      )}

      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
}
