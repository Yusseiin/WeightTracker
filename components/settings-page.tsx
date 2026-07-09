"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Key, Users, Save, Loader2, UserPen, AtSign } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { ChangeNicknameDialog } from '@/components/change-nickname-dialog';
import { ChangeUsernameDialog } from '@/components/change-username-dialog';
import { UserManagementDialog } from '@/components/user-management-dialog';
import { ActivityManager } from '@/components/activity-manager';
import { WaterPresetManager } from '@/components/water-preset-manager';
import { MedicationManager } from '@/components/medication-manager';
import { InjectionSettingsManager } from '@/components/injection-settings-manager';
import { DateFormatEditor } from '@/components/date-format-editor';
import { DEFAULT_DATE_FORMAT } from '@/lib/date-utils';
import type { SessionUser, UserSettings, ChartColor, WaterUnit, DateFormatSettings, DateLocale, SingleDateFormat, CustomActivity, WeightEntry, GoalSettings, WeekStartsOn, WaterPreset, FeatureToggles, MedicationPreset, MedicationEntry, InjectionSettings, InjectionEntry, ChartCombination, BodyMeasurementPreset, MeasurementUnit } from '@/lib/types';
import { DEFAULT_GOALS, WEEK_DAYS, DEFAULT_FEATURE_TOGGLES, DEFAULT_INJECTION_SETTINGS, DEFAULT_CHART_COMBINATIONS, DEFAULT_BODY_MEASUREMENT_PRESETS } from '@/lib/types';
import { mlToOz, ozToMl } from '@/lib/water-utils';
import { ChartCombinationManager } from '@/components/chart-combination-manager';
import { BodyMeasurementPresetManager } from '@/components/body-measurement-preset-manager';
import { useTranslation } from '@/hooks/use-translation';
import { getLanguageName } from '@/lib/i18n-shared';

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
  const { t, locale, languages } = useTranslation();
  const [settings, setSettings] = useState(initialSettings);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Persist the chosen UI language and reload so the server re-renders with the
  // new dictionary (the dictionary is loaded in the root layout).
  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === locale) return;
    setIsChangingLanguage(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLanguage }),
      });
      const result = await res.json();
      if (result.success) {
        setSettings(prev => ({ ...prev, language: newLanguage }));
        router.refresh();
      } else {
        showErrorToast(result.error || t('settings.toasts.changeLanguageError'));
      }
    } catch {
      showErrorToast(t('settings.toasts.changeLanguageError'));
    } finally {
      setIsChangingLanguage(false);
    }
  };
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [medicationEntries, setMedicationEntries] = useState<MedicationEntry[]>([]);
  const [injectionEntries, setInjectionEntries] = useState<InjectionEntry[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changeNicknameOpen, setChangeNicknameOpen] = useState(false);
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);
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
  const [localGoals, setLocalGoals] = useState<GoalSettings>(
    settings.goals || DEFAULT_GOALS
  );
  const [localFeatures, setLocalFeatures] = useState<FeatureToggles>(
    settings.features || DEFAULT_FEATURE_TOGGLES
  );
  const [localShowQuotes, setLocalShowQuotes] = useState(settings.showQuotes ?? true);
  const [localMeasurementUnit, setLocalMeasurementUnit] = useState<MeasurementUnit>(
    settings.measurementUnit || 'cm'
  );

  // Water goal input is displayed in the user's chosen unit; storage is always ml.
  // We keep the raw typed string separate so it isn't clobbered while typing.
  const goalMlToInput = (goalMl: number | null | undefined, unit: 'ml' | 'oz'): string => {
    if (goalMl == null) return '';
    if (unit === 'oz') return mlToOz(goalMl).toFixed(2).replace(/\.?0+$/, '');
    return String(goalMl);
  };
  const [waterGoalInput, setWaterGoalInput] = useState<string>(() =>
    goalMlToInput(settings.goals?.dailyWaterGoal, settings.waterUnit || 'ml')
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

  // Fetch medication entries for medication usage check
  const fetchMedicationEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/medications?all=true');
      const result = await response.json();
      if (result.success) {
        setMedicationEntries(result.data);
      }
    } catch {
      // Silently fail - entries are only needed for medication deletion check
    }
  }, []);

  // Fetch injection entries for injection usage check
  const fetchInjectionEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/injections?all=true');
      const result = await response.json();
      if (result.success) {
        setInjectionEntries(result.data);
      }
    } catch {
      // Silently fail - entries are only needed for injection deletion check
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchMedicationEntries();
    fetchInjectionEntries();
  }, [fetchEntries, fetchMedicationEntries, fetchInjectionEntries]);

  // Check if there are unsaved changes
  const hasChanges =
    localUnit !== settings.unit ||
    localWaterUnit !== (settings.waterUnit || 'ml') ||
    localChartColor !== settings.chartColor ||
    (localTargetWeight === '' ? null : parseFloat(localTargetWeight)) !== settings.targetWeight ||
    JSON.stringify(localDateFormat) !== JSON.stringify(ensureValidDateFormat(settings.dateFormat)) ||
    JSON.stringify(localGoals) !== JSON.stringify(settings.goals || DEFAULT_GOALS) ||
    JSON.stringify(localFeatures) !== JSON.stringify(settings.features || DEFAULT_FEATURE_TOGGLES) ||
    localShowQuotes !== (settings.showQuotes ?? true) ||
    localMeasurementUnit !== (settings.measurementUnit || 'cm');

  // Reset local state when settings change externally
  useEffect(() => {
    setLocalUnit(settings.unit);
    setLocalWaterUnit(settings.waterUnit || 'ml');
    setLocalTargetWeight(settings.targetWeight?.toString() ?? '');
    setLocalChartColor(settings.chartColor);
    setLocalDateFormat(ensureValidDateFormat(settings.dateFormat));
    setLocalGoals(settings.goals || DEFAULT_GOALS);
    setLocalFeatures(settings.features || DEFAULT_FEATURE_TOGGLES);
    setLocalShowQuotes(settings.showQuotes ?? true);
    setLocalMeasurementUnit(settings.measurementUnit || 'cm');
    // Re-derive the water goal input from the saved value + saved unit
    setWaterGoalInput(
      goalMlToInput(settings.goals?.dailyWaterGoal, settings.waterUnit || 'ml')
    );
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
        showErrorToast(t('settings.toasts.logoutError'));
      }
    } catch {
      showErrorToast(t('settings.toasts.logoutError'));
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
          dateFormat: localDateFormat,
          goals: localGoals,
          features: localFeatures,
          showQuotes: localShowQuotes,
          measurementUnit: localMeasurementUnit
        })
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        showSuccessToast(t('settings.toasts.saved'));
      } else {
        showErrorToast(result.error || t('settings.toasts.saveError'));
      }
    } catch {
      showErrorToast(t('settings.toasts.saveError'));
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
    if (value !== 'ml' && value !== 'oz') return;
    setLocalWaterUnit(value);
    // Re-derive the water goal input from the current (unsaved) goal in ml
    setWaterGoalInput(goalMlToInput(localGoals.dailyWaterGoal, value));
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
      throw new Error(result.error || t('settings.toasts.saveActivitiesError'));
    }
  };

  const handleWaterPresetsSave = async (waterPresets: WaterPreset[]) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waterPresets })
    });

    const result = await response.json();

    if (result.success) {
      setSettings(result.data);
    } else {
      throw new Error(result.error || t('settings.toasts.saveWaterPresetsError'));
    }
  };

  const handleMedicationPresetsSave = async (medicationPresets: MedicationPreset[]) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationPresets })
    });

    const result = await response.json();

    if (result.success) {
      setSettings(result.data);
    } else {
      throw new Error(result.error || t('settings.toasts.saveMedicationPresetsError'));
    }
  };

  const handleInjectionSettingsSave = async (injectionSettings: InjectionSettings) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ injectionSettings })
    });

    const result = await response.json();

    if (result.success) {
      setSettings(result.data);
    } else {
      throw new Error(result.error || t('settings.toasts.saveInjectionSettingsError'));
    }
  };

  const handleBodyMeasurementPresetsSave = async (
    bodyMeasurementPresets: BodyMeasurementPreset[]
  ) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyMeasurementPresets })
    });
    const result = await response.json();
    if (result.success) {
      setSettings(result.data);
    } else {
      throw new Error(result.error || t('settings.toasts.saveBodyMeasurementPresetsError'));
    }
  };

  const handleMeasurementUnitChange = (value: string) => {
    if (value === 'cm' || value === 'in') {
      setLocalMeasurementUnit(value);
    }
  };

  const handleBodyMeasurementsToggle = (enabled: boolean) => {
    setLocalFeatures(prev => ({ ...prev, bodyMeasurementsEnabled: enabled }));
    // Seed defaults on first enable if none configured yet
    if (enabled && (settings.bodyMeasurementPresets?.length ?? 0) === 0) {
      // Fire-and-forget seed via the same save path
      handleBodyMeasurementPresetsSave(DEFAULT_BODY_MEASUREMENT_PRESETS).catch(() => {
        // Error already toasted by the caller path
      });
    }
  };

  const handleChartCombinationsSave = async (chartCombinations: ChartCombination[]) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chartCombinations })
    });

    const result = await response.json();

    if (result.success) {
      setSettings(result.data);
    } else {
      throw new Error(result.error || t('settings.toasts.saveChartCombinationsError'));
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
            <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
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
            {isSaving ? t('common.saving') : t('common.save')}
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
                <h3 className="font-medium text-base">{t('settings.units.title')}</h3>
                {/* Weight Unit */}
                <div className="space-y-2">
                  <Label>{t('settings.units.weightUnit')}</Label>
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
                  <Label>{t('settings.units.waterUnit')}</Label>
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

                {/* Measurement Unit (body measurements) */}
                <div className="space-y-2">
                  <Label>{t('settings.units.measurementUnit')}</Label>
                  <ToggleGroup
                    type="single"
                    value={localMeasurementUnit}
                    onValueChange={handleMeasurementUnitChange}
                    className="justify-start"
                    variant="outline"
                  >
                    <ToggleGroupItem value="cm" className="min-w-16">
                      cm
                    </ToggleGroupItem>
                    <ToggleGroupItem value="in" className="min-w-16">
                      in
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Target Weight */}
                <div className="space-y-2">
                  <Label>{t('settings.units.targetWeight', { unit: localUnit })}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={t('common.optional')}
                    value={localTargetWeight}
                    onChange={handleTargetWeightChange}
                    className="max-w-32"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Display Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">{t('settings.display.title')}</h3>
                <div className="space-y-2">
                  <Label>{t('settings.display.chartColor')}</Label>
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
                        {t(`settings.display.chartColors.${option.value}`)}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showQuotes"
                    checked={localShowQuotes}
                    onCheckedChange={(checked) => setLocalShowQuotes(checked === true)}
                  />
                  <Label htmlFor="showQuotes" className="cursor-pointer">
                    {t('settings.display.showQuotes')}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Chart Configuration Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">{t('settings.chartConfig.title')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('settings.chartConfig.description')}
                </p>
                <ChartCombinationManager
                  combinations={settings.chartCombinations || DEFAULT_CHART_COMBINATIONS}
                  onSave={handleChartCombinationsSave}
                  features={localFeatures}
                  injectionSettings={settings.injectionSettings}
                />
              </CardContent>
            </Card>

            {/* Optional Features Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">{t('settings.features.title')}</h3>
                <p className="text-xs text-muted-foreground">{t('settings.features.description')}</p>

                {/* Water Tracking */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waterEnabled"
                    checked={localFeatures.waterEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      waterEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="waterEnabled" className="cursor-pointer">
                    {t('settings.features.water')}
                  </Label>
                </div>

                {/* Water History (individual timestamped entries) - only when water is enabled */}
                {localFeatures.waterEnabled && (
                  <div className="flex items-center space-x-2 ml-6">
                    <Checkbox
                      id="waterHistoryEnabled"
                      checked={localFeatures.waterHistoryEnabled}
                      onCheckedChange={(checked) => setLocalFeatures(prev => ({
                        ...prev,
                        waterHistoryEnabled: checked === true
                      }))}
                    />
                    <Label htmlFor="waterHistoryEnabled" className="cursor-pointer">
                      {t('settings.features.waterHistory')}
                    </Label>
                  </div>
                )}

                {/* Steps Tracking */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stepsEnabled"
                    checked={localFeatures.stepsEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      stepsEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="stepsEnabled" className="cursor-pointer">
                    {t('settings.features.steps')}
                  </Label>
                </div>

                {/* Blood Pressure Tracking */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pressureEnabled"
                    checked={localFeatures.pressureEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      pressureEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="pressureEnabled" className="cursor-pointer">
                    {t('settings.features.pressure')}
                  </Label>
                </div>

                {/* Medication Tracking */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="medicationEnabled"
                    checked={localFeatures.medicationEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      medicationEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="medicationEnabled" className="cursor-pointer">
                    {t('settings.features.medication')}
                  </Label>
                </div>

                {/* Injection Tracking */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="injectionsEnabled"
                    checked={localFeatures.injectionsEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      injectionsEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="injectionsEnabled" className="cursor-pointer">
                    {t('settings.features.injections')}
                  </Label>
                </div>

                {/* Photo Attachments */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="photosEnabled"
                    checked={localFeatures.photosEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      photosEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="photosEnabled" className="cursor-pointer">
                    {t('settings.features.photos')}
                  </Label>
                </div>

                {/* Body Fat % Tracking */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bodyFatEnabled"
                    checked={localFeatures.bodyFatEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      bodyFatEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="bodyFatEnabled" className="cursor-pointer">
                    {t('settings.features.bodyFat')}
                  </Label>
                </div>

                {/* Body Measurements Tracking */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bodyMeasurementsEnabled"
                    checked={localFeatures.bodyMeasurementsEnabled}
                    onCheckedChange={(checked) =>
                      handleBodyMeasurementsToggle(checked === true)
                    }
                  />
                  <Label htmlFor="bodyMeasurementsEnabled" className="cursor-pointer">
                    {t('settings.features.bodyMeasurements')}
                  </Label>
                </div>

                <h3 className="font-medium text-base pt-2">{t('settings.notes.title')}</h3>
                <p className="text-xs text-muted-foreground">{t('settings.notes.description')}</p>

                {/* Weight Notes */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="weightNotesEnabled"
                    checked={localFeatures.weightNotesEnabled}
                    onCheckedChange={(checked) => setLocalFeatures(prev => ({
                      ...prev,
                      weightNotesEnabled: checked === true
                    }))}
                  />
                  <Label htmlFor="weightNotesEnabled" className="cursor-pointer">
                    {t('settings.notes.weight')}
                  </Label>
                </div>

                {/* Steps Notes */}
                {localFeatures.stepsEnabled && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stepsNotesEnabled"
                      checked={localFeatures.stepsNotesEnabled}
                      onCheckedChange={(checked) => setLocalFeatures(prev => ({
                        ...prev,
                        stepsNotesEnabled: checked === true
                      }))}
                    />
                    <Label htmlFor="stepsNotesEnabled" className="cursor-pointer">
                      {t('settings.notes.steps')}
                    </Label>
                  </div>
                )}

                {/* Pressure Notes */}
                {localFeatures.pressureEnabled && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pressureNotesEnabled"
                      checked={localFeatures.pressureNotesEnabled}
                      onCheckedChange={(checked) => setLocalFeatures(prev => ({
                        ...prev,
                        pressureNotesEnabled: checked === true
                      }))}
                    />
                    <Label htmlFor="pressureNotesEnabled" className="cursor-pointer">
                      {t('settings.notes.pressure')}
                    </Label>
                  </div>
                )}

                {/* Medication Notes */}
                {localFeatures.medicationEnabled && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="medicationNotesEnabled"
                      checked={localFeatures.medicationNotesEnabled}
                      onCheckedChange={(checked) => setLocalFeatures(prev => ({
                        ...prev,
                        medicationNotesEnabled: checked === true
                      }))}
                    />
                    <Label htmlFor="medicationNotesEnabled" className="cursor-pointer">
                      {t('settings.notes.medication')}
                    </Label>
                  </div>
                )}

                {/* Injection Notes */}
                {localFeatures.injectionsEnabled && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="injectionNotesEnabled"
                      checked={localFeatures.injectionNotesEnabled}
                      onCheckedChange={(checked) => setLocalFeatures(prev => ({
                        ...prev,
                        injectionNotesEnabled: checked === true
                      }))}
                    />
                    <Label htmlFor="injectionNotesEnabled" className="cursor-pointer">
                      {t('settings.notes.injection')}
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Goals Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">{t('settings.goals.title')}</h3>
                <p className="text-xs text-muted-foreground">{t('settings.goals.description')}</p>

                {/* Daily Water Goal - only show if water feature is enabled */}
                {localFeatures.waterEnabled && (
                  <div className="space-y-2">
                    <Label>{t('settings.goals.dailyWater', { unit: localWaterUnit === 'ml' ? 'ml' : 'oz' })}</Label>
                    <Input
                      type="number"
                      step={localWaterUnit === 'ml' ? '100' : '0.1'}
                      min="0"
                      inputMode="decimal"
                      placeholder={localWaterUnit === 'ml' ? t('settings.goals.dailyWaterPlaceholderMl') : t('settings.goals.dailyWaterPlaceholderOz')}
                      value={waterGoalInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setWaterGoalInput(raw);
                        if (raw === '') {
                          setLocalGoals(prev => ({ ...prev, dailyWaterGoal: null }));
                          return;
                        }
                        const num = parseFloat(raw);
                        if (!Number.isFinite(num) || num < 0) return;
                        const ml = localWaterUnit === 'oz' ? ozToMl(num) : num;
                        setLocalGoals(prev => ({ ...prev, dailyWaterGoal: ml }));
                      }}
                      className="max-w-32"
                    />
                  </div>
                )}

                {/* Daily Steps Goal - only show if steps feature is enabled */}
                {localFeatures.stepsEnabled && (
                  <div className="space-y-2">
                    <Label>{t('settings.goals.dailySteps')}</Label>
                    <Input
                      type="number"
                      step="1000"
                      placeholder={t('settings.goals.dailyStepsPlaceholder')}
                      value={localGoals.dailyStepsGoal ?? ''}
                      onChange={(e) => setLocalGoals(prev => ({
                        ...prev,
                        dailyStepsGoal: e.target.value === '' ? null : parseInt(e.target.value)
                      }))}
                      className="max-w-32"
                    />
                  </div>
                )}

                {/* Weekly Weight Goal */}
                <div className="space-y-2">
                  <Label>{t('settings.goals.weeklyWeight', { unit: localUnit })}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={t('settings.goals.weeklyWeightPlaceholder')}
                    value={localGoals.weeklyWeightGoal ?? ''}
                    onChange={(e) => setLocalGoals(prev => ({
                      ...prev,
                      weeklyWeightGoal: e.target.value === '' ? null : parseFloat(e.target.value)
                    }))}
                    className="max-w-32"
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.goals.negativeHint')}</p>
                </div>

                {/* Monthly Weight Goal */}
                <div className="space-y-2">
                  <Label>{t('settings.goals.monthlyWeight', { unit: localUnit })}</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder={t('settings.goals.monthlyWeightPlaceholder')}
                    value={localGoals.monthlyWeightGoal ?? ''}
                    onChange={(e) => setLocalGoals(prev => ({
                      ...prev,
                      monthlyWeightGoal: e.target.value === '' ? null : parseFloat(e.target.value)
                    }))}
                    className="max-w-32"
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.goals.negativeHint')}</p>
                </div>

                {/* Week Starts On */}
                <div className="space-y-2">
                  <Label>{t('settings.goals.weekStartsOn')}</Label>
                  <Select
                    value={String(localGoals.weekStartsOn ?? 1)}
                    onValueChange={(value) => {
                      setLocalGoals(prev => ({
                        ...prev,
                        weekStartsOn: parseInt(value) as WeekStartsOn
                      }));
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_DAYS.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {t(`settings.weekDays.${day.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Activities Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">{t('settings.activities.title')}</h3>
                <div className="space-y-2">
                  <Label>{t('settings.activities.custom')}</Label>
                  <ActivityManager
                    activities={settings.activities}
                    onSave={handleActivitiesSave}
                    entries={entries}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Water Presets Card - only show if water feature is enabled */}
            {localFeatures.waterEnabled && (
              <Card className="py-4">
                <CardContent className="space-y-4">
                  <h3 className="font-medium text-base">{t('settings.waterPresets.title')}</h3>
                  <div className="space-y-2">
                    <Label>{t('settings.waterPresets.quickAdd')}</Label>
                    <WaterPresetManager
                      presets={settings.waterPresets}
                      onSave={handleWaterPresetsSave}
                      waterUnit={localWaterUnit}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medication Presets Card - only show if medication feature is enabled */}
            {localFeatures.medicationEnabled && (
              <Card className="py-4">
                <CardContent className="space-y-4">
                  <h3 className="font-medium text-base">{t('settings.medicationPresets.title')}</h3>
                  <div className="space-y-2">
                    <Label>{t('settings.medicationPresets.toTrack')}</Label>
                    <MedicationManager
                      medications={settings.medicationPresets || []}
                      onSave={handleMedicationPresetsSave}
                      medicationEntries={medicationEntries}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Injection Settings Card - only show if injection feature is enabled */}
            {localFeatures.injectionsEnabled && (
              <Card className="py-4">
                <CardContent className="space-y-4">
                  <h3 className="font-medium text-base">{t('settings.injectionSettings.title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('settings.injectionSettings.description')}</p>
                  <div className="space-y-2">
                    <Label>{t('settings.injectionSettings.injectableMedications')}</Label>
                    <InjectionSettingsManager
                      settings={settings.injectionSettings || DEFAULT_INJECTION_SETTINGS}
                      onSave={handleInjectionSettingsSave}
                      injectionEntries={injectionEntries}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Body Measurements Presets Card - only show if body measurements feature is enabled */}
            {localFeatures.bodyMeasurementsEnabled && (
              <Card className="py-4">
                <CardContent className="space-y-4">
                  <h3 className="font-medium text-base">{t('settings.bodyMeasurements.title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('settings.bodyMeasurements.description')}</p>
                  <BodyMeasurementPresetManager
                    presets={settings.bodyMeasurementPresets || []}
                    onSave={handleBodyMeasurementPresetsSave}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Date Format & Account */}
          <div className="space-y-2">
            {/* Date Format Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <h3 className="font-medium text-base">{t('settings.dateFormat.title')}</h3>

                {/* Locale Selector */}
                <div className="space-y-2">
                  <Label>{t('settings.language')}</Label>
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
                  label={t('settings.dateFormat.historyTable')}
                  value={localDateFormat.tableFormat}
                  locale={localDateFormat.locale}
                  onChange={handleTableFormatChange}
                />

                <DateFormatEditor
                  label={t('settings.dateFormat.chartTooltip')}
                  value={localDateFormat.tooltipFormat}
                  locale={localDateFormat.locale}
                  onChange={handleTooltipFormatChange}
                />

                <DateFormatEditor
                  label={t('settings.dateFormat.chartAxis')}
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
                <h3 className="font-medium text-base">{t('settings.account')}</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  {t('settings.loggedInAs')} <span className="font-medium text-foreground">{session.nickname}</span>
                </div>

                {/* Language selector (populated from available dictionaries) */}
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="language-select">{t('settings.language')}</Label>
                  <Select value={locale} onValueChange={handleLanguageChange} disabled={isChangingLanguage}>
                    <SelectTrigger id="language-select" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((code) => (
                        <SelectItem key={code} value={code}>
                          {getLanguageName(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setChangeUsernameOpen(true)}
                >
                  <AtSign className="mr-2 h-4 w-4" />
                  {t('settings.changeUsername')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setChangeNicknameOpen(true)}
                >
                  <UserPen className="mr-2 h-4 w-4" />
                  {t('settings.changeNickname')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  <Key className="mr-2 h-4 w-4" />
                  {t('settings.changePassword')}
                </Button>

                {/* Admin Section */}
                {session.role === 'admin' && (
                  <>
                    <Separator className="my-3" />
                    <div className="text-sm text-muted-foreground mb-2">{t('settings.administration')}</div>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setUserManagementOpen(true)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {t('settings.manageUsers')}
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
                  {isLoggingOut ? t('settings.loggingOut') : t('settings.logout')}
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

      <ChangeUsernameDialog
        open={changeUsernameOpen}
        onOpenChange={setChangeUsernameOpen}
        currentUsername={session.username}
      />

      <UserManagementDialog
        open={userManagementOpen}
        onOpenChange={setUserManagementOpen}
        currentUsername={session.username}
      />
    </div>
  );
}
