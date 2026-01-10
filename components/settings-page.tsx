"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Key, Users, Save, Loader2, UserPen } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { ChangeNicknameDialog } from '@/components/change-nickname-dialog';
import { UserManagementDialog } from '@/components/user-management-dialog';
import { ActivityManager } from '@/components/activity-manager';
import { DateFormatEditor } from '@/components/date-format-editor';
import { DEFAULT_DATE_FORMAT } from '@/lib/date-utils';
import type { SessionUser, UserSettings, ChartColor, WaterUnit, DateFormatSettings, DateLocale, SingleDateFormat, CustomActivity, WeightEntry } from '@/lib/types';

interface SettingsPageProps {
  session: SessionUser;
  initialSettings: UserSettings;
}

const CHART_COLOR_OPTIONS: { value: ChartColor; label: string; color: string }[] = [
  { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', color: 'bg-purple-500' }
];

const LOCALE_OPTIONS: { value: DateLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italiano' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
  { value: 'es', label: 'Espanol' },
];

// Ensure we have valid date format settings with all required fields
function ensureValidDateFormat(settings?: Partial<DateFormatSettings>): DateFormatSettings {
  if (!settings) return DEFAULT_DATE_FORMAT;

  return {
    locale: settings.locale || DEFAULT_DATE_FORMAT.locale,
    tableFormat: settings.tableFormat || DEFAULT_DATE_FORMAT.tableFormat,
    tooltipFormat: settings.tooltipFormat || DEFAULT_DATE_FORMAT.tooltipFormat,
    axisFormat: settings.axisFormat || DEFAULT_DATE_FORMAT.axisFormat,
  };
}

export function SettingsPage({ session, initialSettings }: SettingsPageProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changeNicknameOpen, setChangeNicknameOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);

  // Local state for form values
  const [localUnit, setLocalUnit] = useState(settings.unit);
  const [localWaterUnit, setLocalWaterUnit] = useState<WaterUnit>(settings.waterUnit || 'ml');
  const [localTargetWeight, setLocalTargetWeight] = useState<string>(
    settings.targetWeight?.toString() ?? ''
  );
  const [localChartColor, setLocalChartColor] = useState(settings.chartColor);
  const [localDateFormat, setLocalDateFormat] = useState<DateFormatSettings>(
    ensureValidDateFormat(settings.dateFormat)
  );

  // Fetch entries for activity usage check
  const fetchEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/entries');
      const result = await response.json();
      if (result.success) {
        setEntries(result.data);
      }
    } catch {
      // Silently fail - entries are only needed for activity deletion check
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Check if there are unsaved changes
  const hasChanges =
    localUnit !== settings.unit ||
    localWaterUnit !== (settings.waterUnit || 'ml') ||
    localChartColor !== settings.chartColor ||
    (localTargetWeight === '' ? null : parseFloat(localTargetWeight)) !== settings.targetWeight ||
    JSON.stringify(localDateFormat) !== JSON.stringify(ensureValidDateFormat(settings.dateFormat));

  // Reset local state when settings change externally
  useEffect(() => {
    setLocalUnit(settings.unit);
    setLocalWaterUnit(settings.waterUnit || 'ml');
    setLocalTargetWeight(settings.targetWeight?.toString() ?? '');
    setLocalChartColor(settings.chartColor);
    setLocalDateFormat(ensureValidDateFormat(settings.dateFormat));
  }, [settings]);

  const handleGoBack = () => {
    router.push('/');
    router.refresh();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
        router.refresh();
      } else {
        showErrorToast('Failed to logout');
      }
    } catch {
      showErrorToast('Failed to logout');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const targetWeight = localTargetWeight === ''
        ? null
        : parseFloat(localTargetWeight);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit: localUnit,
          waterUnit: localWaterUnit,
          targetWeight,
          chartColor: localChartColor,
          dateFormat: localDateFormat
        })
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        showSuccessToast('Settings saved');
      } else {
        showErrorToast(result.error || 'Failed to save settings');
      }
    } catch {
      showErrorToast('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnitChange = (value: string) => {
    if (value === 'kg' || value === 'lb') {
      setLocalUnit(value);
    }
  };

  const handleWaterUnitChange = (value: string) => {
    if (value === 'ml' || value === 'oz') {
      setLocalWaterUnit(value);
    }
  };

  const handleTargetWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTargetWeight(e.target.value);
  };

  const handleChartColorChange = (value: string) => {
    if (value) {
      setLocalChartColor(value as ChartColor);
    }
  };

  const handleLocaleChange = (value: string) => {
    setLocalDateFormat(prev => ({ ...prev, locale: value as DateLocale }));
  };

  const handleTableFormatChange = (value: SingleDateFormat) => {
    setLocalDateFormat(prev => ({ ...prev, tableFormat: value }));
  };

  const handleTooltipFormatChange = (value: SingleDateFormat) => {
    setLocalDateFormat(prev => ({ ...prev, tooltipFormat: value }));
  };

  const handleAxisFormatChange = (value: SingleDateFormat) => {
    setLocalDateFormat(prev => ({ ...prev, axisFormat: value }));
  };

  const handleActivitiesSave = async (activities: CustomActivity[]) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities })
    });

    const result = await response.json();

    if (result.success) {
      setSettings(result.data);
    } else {
      throw new Error(result.error || 'Failed to save activities');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {/* Left Column - Units & Chart */}
          <div className="space-y-2">
            {/* Units Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">Units</h3>
                {/* Weight Unit */}
                <div className="space-y-2">
                  <Label>Weight Unit</Label>
                  <ToggleGroup
                    type="single"
                    value={localUnit}
                    onValueChange={handleUnitChange}
                    className="justify-start"
                    variant="outline"
                  >
                    <ToggleGroupItem value="kg" className="min-w-16">
                      kg
                    </ToggleGroupItem>
                    <ToggleGroupItem value="lb" className="min-w-16">
                      lb
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Water Unit */}
                <div className="space-y-2">
                  <Label>Water Unit</Label>
                  <ToggleGroup
                    type="single"
                    value={localWaterUnit}
                    onValueChange={handleWaterUnitChange}
                    className="justify-start"
                    variant="outline"
                  >
                    <ToggleGroupItem value="ml" className="min-w-16">
                      ml/L
                    </ToggleGroupItem>
                    <ToggleGroupItem value="oz" className="min-w-16">
                      oz
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Target Weight */}
                <div className="space-y-2">
                  <Label>Target Weight ({localUnit})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Optional"
                    value={localTargetWeight}
                    onChange={handleTargetWeightChange}
                    className="max-w-32"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Chart Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">Chart</h3>
                <div className="space-y-2">
                  <Label>Chart Color</Label>
                  <ToggleGroup
                    type="single"
                    value={localChartColor}
                    onValueChange={handleChartColorChange}
                    className="justify-start flex-wrap"
                    variant="outline"
                  >
                    {CHART_COLOR_OPTIONS.map((option) => (
                      <ToggleGroupItem
                        key={option.value}
                        value={option.value}
                        className="gap-2 px-3"
                      >
                        <span className={`w-3 h-3 rounded-full ${option.color}`} />
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </CardContent>
            </Card>

            {/* Activities Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">Activities</h3>
                <div className="space-y-2">
                  <Label>Custom Activities</Label>
                  <ActivityManager
                    activities={settings.activities}
                    onSave={handleActivitiesSave}
                    entries={entries}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Date Format & Account */}
          <div className="space-y-2">
            {/* Date Format Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">Date Format</h3>

                {/* Locale Selector */}
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={localDateFormat.locale} onValueChange={handleLocaleChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3 Date Format Editors */}
                <DateFormatEditor
                  label="History Table"
                  value={localDateFormat.tableFormat}
                  locale={localDateFormat.locale}
                  onChange={handleTableFormatChange}
                />

                <DateFormatEditor
                  label="Chart Tooltip"
                  value={localDateFormat.tooltipFormat}
                  locale={localDateFormat.locale}
                  onChange={handleTooltipFormatChange}
                />

                <DateFormatEditor
                  label="Chart X-Axis"
                  value={localDateFormat.axisFormat}
                  locale={localDateFormat.locale}
                  onChange={handleAxisFormatChange}
                />
              </CardContent>
            </Card>
          </div>

          {/* Third Column - Account */}
          <div className="space-y-2">
            {/* Account Card */}
            <Card className="py-4">
              <CardContent className="space-y-3">
                <h3 className="font-medium text-base">Account</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  Logged in as <span className="font-medium text-foreground">{session.nickname}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setChangeNicknameOpen(true)}
                >
                  <UserPen className="mr-2 h-4 w-4" />
                  Change Nickname
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>

                {/* Admin Section */}
                {session.role === 'admin' && (
                  <>
                    <Separator className="my-3" />
                    <div className="text-sm text-muted-foreground mb-2">Administration</div>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setUserManagementOpen(true)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                  </>
                )}

                <Separator className="my-3" />
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />

      <ChangeNicknameDialog
        open={changeNicknameOpen}
        onOpenChange={setChangeNicknameOpen}
        currentNickname={session.nickname}
      />

      <UserManagementDialog
        open={userManagementOpen}
        onOpenChange={setUserManagementOpen}
        currentUsername={session.username}
      />
    </div>
  );
}
