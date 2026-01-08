"use client";

import { useState } from 'react';
import { WeightChart } from '@/components/weight-chart';
import { AddEntryDialog } from '@/components/add-entry-dialog';
import { AddWaterDialog } from '@/components/add-water-dialog';
import { EntriesTable } from '@/components/entries-table';
import { EditEntryDialog } from '@/components/edit-entry-dialog';
import { SettingsButton } from '@/components/settings-popup';
import { TodayRecap } from '@/components/today-recap';
import { useWeightEntries } from '@/hooks/use-weight-entries';
import { useWater } from '@/hooks/use-water';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WeightEntry, UserSettings, SessionUser, WaterEntry } from '@/lib/types';

interface WeightTrackerProps {
  initialEntries: WeightEntry[];
  initialSettings: UserSettings;
  initialWater: WaterEntry | null;
  initialWaterEntries: WaterEntry[];
  session: SessionUser | null;
}

export function WeightTracker({ initialEntries, initialSettings, initialWater, initialWaterEntries, session }: WeightTrackerProps) {
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
  } = useWater(initialWater, initialWaterEntries);

  const [selectedEntry, setSelectedEntry] = useState<WeightEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
            <h1 className="text-lg font-semibold">Weight Tracker</h1>
            {session && (
              <span className="text-sm text-muted-foreground">
                ({session.nickname})
              </span>
            )}
          </div>
          {session && <SettingsButton />}
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-1 pb-18 space-y-1 max-w-3xl mx-auto flex-1 overflow-hidden flex flex-col">
        {/* Today's Recap */}
        <TodayRecap
          entries={entries}
          todayWater={todayWater}
          unit={settings.unit}
          waterUnit={settings.waterUnit || 'ml'}
        />

        <Tabs defaultValue="chart" className="w-full flex-1 flex flex-col overflow-hidden mt-1">
          <TabsList className="w-full grid grid-cols-2 shrink-0">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-0 flex-1 overflow-hidden">
            {/* Weight Chart */}
            <WeightChart
              entries={entries}
              targetWeight={settings.targetWeight}
              unit={settings.unit}
              chartColor={settings.chartColor}
              dateFormat={settings.dateFormat}
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
              dateFormat={settings.dateFormat}
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
      />

      {/* Add Entry Dialog/Drawer */}
      <AddEntryDialog
        onSubmit={addEntry}
        unit={settings.unit}
      />

      {/* Add Water Dialog/Drawer */}
      <AddWaterDialog
        todayWater={todayWater}
        onAddWater={addWater}
        onResetWater={resetWater}
        isLoading={isWaterLoading}
        waterUnit={settings.waterUnit || 'ml'}
      />
    </>
  );
}
