import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/data';
import { getSession } from '@/lib/auth';
import { getAvailableLanguages } from '@/lib/i18n';
import { ApiResponse, UserSettings, DateFormatSettings, SingleDateFormat, CustomActivity, MAX_ACTIVITIES, GoalSettings, WaterPreset, MAX_WATER_PRESETS, FeatureToggles, MedicationPreset, MAX_MEDICATIONS, MedicationSchedule, MedicationScheduleType, MedicationTrackingMode, InjectionSettings, InjectableMedication, InjectionSitePreset, MAX_INJECTABLE_MEDICATIONS, MAX_INJECTION_SITES, ChartCombination, ChartView, ChartType, BodyMeasurementPreset, MAX_BODY_MEASUREMENT_PRESETS, MeasurementUnit, ButtonBarOrderMode, ActionButtonKey, DEFAULT_ACTION_BUTTON_ORDER } from '@/lib/types';
import { ALL_ACTIVITY_ICONS, WATER_ICONS, MEDICATION_ICONS } from '@/lib/icons';

// Validation constants
const VALID_DATE_FORMATS = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd MMM yyyy', 'EEE dd/MM', 'EEE.dd/MM', 'dd/MM', 'MMM dd', 'custom'];
const VALID_TIME_FORMATS = ['HH:mm', 'hh:mm a', 'none'];
const VALID_LOCALES = ['en', 'it', 'de', 'fr', 'es'];

// Validate a single date format setting
function isValidSingleDateFormat(format: unknown): format is SingleDateFormat {
  if (!format || typeof format !== 'object') return false;
  const f = format as Record<string, unknown>;

  if (!f.dateFormat || !VALID_DATE_FORMATS.includes(f.dateFormat as string)) return false;
  if (!f.timeFormat || !VALID_TIME_FORMATS.includes(f.timeFormat as string)) return false;
  if (typeof f.showWeekday !== 'boolean') return false;
  if (f.dateFormat === 'custom' && typeof f.customDateFormat !== 'string') return false;

  return true;
}

// Validate complete date format settings
function isValidDateFormatSettings(settings: unknown): settings is DateFormatSettings {
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Record<string, unknown>;

  if (!s.locale || !VALID_LOCALES.includes(s.locale as string)) return false;
  if (!isValidSingleDateFormat(s.tableFormat)) return false;
  if (!isValidSingleDateFormat(s.tooltipFormat)) return false;
  if (!isValidSingleDateFormat(s.axisFormat)) return false;
  // recapFormat is optional for backward compatibility with older clients
  if (s.recapFormat !== undefined && !isValidSingleDateFormat(s.recapFormat)) return false;

  return true;
}

// Validate a single activity
function isValidActivity(activity: unknown): activity is CustomActivity {
  if (!activity || typeof activity !== 'object') return false;
  const a = activity as Record<string, unknown>;

  if (typeof a.id !== 'string' || a.id.trim() === '') return false;
  if (typeof a.label !== 'string' || a.label.trim() === '') return false;
  if (typeof a.icon !== 'string' || !ALL_ACTIVITY_ICONS.includes(a.icon)) return false;
  if (typeof a.color !== 'string') return false;

  return true;
}

// Validate activities array
function isValidActivitiesArray(activities: unknown): activities is CustomActivity[] {
  if (!Array.isArray(activities)) return false;
  if (activities.length === 0 || activities.length > MAX_ACTIVITIES) return false;

  // Check all activities are valid
  if (!activities.every(isValidActivity)) return false;

  // Check for unique IDs
  const ids = activities.map((a) => a.id);
  if (new Set(ids).size !== ids.length) return false;

  return true;
}

// Validate goal settings
function isValidGoalSettings(goals: unknown): goals is GoalSettings {
  if (!goals || typeof goals !== 'object') return false;
  const g = goals as Record<string, unknown>;

  // dailyWaterGoal: null or positive number
  if (g.dailyWaterGoal !== null && g.dailyWaterGoal !== undefined) {
    if (typeof g.dailyWaterGoal !== 'number' || g.dailyWaterGoal < 0) return false;
  }

  // weeklyWeightGoal: null or number (can be negative for weight loss)
  if (g.weeklyWeightGoal !== null && g.weeklyWeightGoal !== undefined) {
    if (typeof g.weeklyWeightGoal !== 'number') return false;
  }

  // monthlyWeightGoal: null or number (can be negative for weight loss)
  if (g.monthlyWeightGoal !== null && g.monthlyWeightGoal !== undefined) {
    if (typeof g.monthlyWeightGoal !== 'number') return false;
  }

  // weekStartsOn: 0-6 (Sunday to Saturday)
  if (g.weekStartsOn !== undefined) {
    if (typeof g.weekStartsOn !== 'number' || g.weekStartsOn < 0 || g.weekStartsOn > 6) return false;
  }

  return true;
}

// Validate a single water preset
function isValidWaterPreset(preset: unknown): preset is WaterPreset {
  if (!preset || typeof preset !== 'object') return false;
  const p = preset as Record<string, unknown>;

  if (typeof p.id !== 'string' || p.id.trim() === '') return false;
  if (typeof p.label !== 'string' || p.label.trim() === '') return false;
  if (typeof p.icon !== 'string' || !WATER_ICONS.includes(p.icon)) return false;
  if (typeof p.amount !== 'number' || p.amount <= 0) return false;

  return true;
}

// Validate water presets array
function isValidWaterPresetsArray(presets: unknown): presets is WaterPreset[] {
  if (!Array.isArray(presets)) return false;
  if (presets.length === 0 || presets.length > MAX_WATER_PRESETS) return false;

  // Check all presets are valid
  if (!presets.every(isValidWaterPreset)) return false;

  // Check for unique IDs
  const ids = presets.map((p) => p.id);
  if (new Set(ids).size !== ids.length) return false;

  return true;
}

// Validate feature toggles
function isValidFeatureToggles(features: unknown): features is FeatureToggles {
  if (!features || typeof features !== 'object') return false;
  const f = features as Record<string, unknown>;

  // All fields are optional - if present, they must be boolean
  if (f.stepsEnabled !== undefined && typeof f.stepsEnabled !== 'boolean') return false;
  if (f.pressureEnabled !== undefined && typeof f.pressureEnabled !== 'boolean') return false;
  if (f.medicationEnabled !== undefined && typeof f.medicationEnabled !== 'boolean') return false;
  if (f.injectionsEnabled !== undefined && typeof f.injectionsEnabled !== 'boolean') return false;
  if (f.waterEnabled !== undefined && typeof f.waterEnabled !== 'boolean') return false;
  if (f.bodyFatEnabled !== undefined && typeof f.bodyFatEnabled !== 'boolean') return false;
  if (f.bodyMeasurementsEnabled !== undefined && typeof f.bodyMeasurementsEnabled !== 'boolean') return false;

  return true;
}

// Valid tracking modes and schedule types
const VALID_TRACKING_MODES: MedicationTrackingMode[] = ['boolean', 'dosage'];
const VALID_SCHEDULE_TYPES: MedicationScheduleType[] = ['daily', 'weekly', 'interval'];

// Validate medication schedule
function isValidMedicationSchedule(schedule: unknown): schedule is MedicationSchedule {
  if (!schedule || typeof schedule !== 'object') return false;
  const s = schedule as Record<string, unknown>;

  if (!s.type || !VALID_SCHEDULE_TYPES.includes(s.type as MedicationScheduleType)) return false;

  // Validate based on schedule type
  if (s.type === 'weekly') {
    if (s.daysOfWeek !== undefined) {
      if (!Array.isArray(s.daysOfWeek)) return false;
      if (!s.daysOfWeek.every((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)) return false;
    }
  }

  if (s.type === 'interval') {
    if (s.intervalDays !== undefined && (typeof s.intervalDays !== 'number' || s.intervalDays < 1)) return false;
    if (s.startDate !== undefined && typeof s.startDate !== 'string') return false;
  }

  // expectedDose is optional but must be a positive number if present
  if (s.expectedDose !== undefined && (typeof s.expectedDose !== 'number' || s.expectedDose <= 0)) return false;

  return true;
}

// Validate a single medication preset
function isValidMedicationPreset(preset: unknown): preset is MedicationPreset {
  if (!preset || typeof preset !== 'object') return false;
  const p = preset as Record<string, unknown>;

  if (typeof p.id !== 'string' || p.id.trim() === '') return false;
  if (typeof p.label !== 'string' || p.label.trim() === '') return false;
  if (typeof p.icon !== 'string' || !MEDICATION_ICONS.includes(p.icon)) return false;
  if (typeof p.color !== 'string') return false;

  // Optional: validate trackingMode if present
  if (p.trackingMode !== undefined && !VALID_TRACKING_MODES.includes(p.trackingMode as MedicationTrackingMode)) return false;

  // Optional: validate unit if present (must be string)
  if (p.unit !== undefined && typeof p.unit !== 'string') return false;

  // Optional: validate schedule if present
  if (p.schedule !== undefined && !isValidMedicationSchedule(p.schedule)) return false;

  return true;
}

// Validate medication presets array
function isValidMedicationPresetsArray(presets: unknown): presets is MedicationPreset[] {
  if (!Array.isArray(presets)) return false;
  if (presets.length > MAX_MEDICATIONS) return false;

  // Check all presets are valid
  if (!presets.every(isValidMedicationPreset)) return false;

  // Check for unique IDs
  const ids = presets.map((p) => p.id);
  if (new Set(ids).size !== ids.length) return false;

  return true;
}

// Validate a single injectable medication
function isValidInjectableMedication(med: unknown): med is InjectableMedication {
  if (!med || typeof med !== 'object') return false;
  const m = med as Record<string, unknown>;

  if (typeof m.id !== 'string' || m.id.trim() === '') return false;
  if (typeof m.name !== 'string' || m.name.trim() === '') return false;
  if (typeof m.color !== 'string') return false;
  if (typeof m.unit !== 'string' || m.unit.trim() === '') return false;
  if (!Array.isArray(m.availableDoses) || m.availableDoses.length === 0) return false;
  if (!m.availableDoses.every((d: unknown) => typeof d === 'number' && d > 0)) return false;

  return true;
}

// Validate a single injection site preset
function isValidInjectionSitePreset(site: unknown): site is InjectionSitePreset {
  if (!site || typeof site !== 'object') return false;
  const s = site as Record<string, unknown>;

  if (typeof s.id !== 'string' || s.id.trim() === '') return false;
  if (typeof s.label !== 'string' || s.label.trim() === '') return false;
  if (typeof s.icon !== 'string') return false;

  return true;
}

// Validate injection settings
function isValidInjectionSettings(settings: unknown): settings is InjectionSettings {
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Record<string, unknown>;

  // Validate medications array
  if (!Array.isArray(s.medications)) return false;
  if (s.medications.length > MAX_INJECTABLE_MEDICATIONS) return false;
  if (!s.medications.every(isValidInjectableMedication)) return false;

  // Check for unique medication IDs
  const medIds = s.medications.map((m: InjectableMedication) => m.id);
  if (new Set(medIds).size !== medIds.length) return false;

  // Validate injection sites array
  if (!Array.isArray(s.injectionSites)) return false;
  if (s.injectionSites.length > MAX_INJECTION_SITES) return false;
  if (!s.injectionSites.every(isValidInjectionSitePreset)) return false;

  // Check for unique site IDs
  const siteIds = s.injectionSites.map((site: InjectionSitePreset) => site.id);
  if (new Set(siteIds).size !== siteIds.length) return false;

  // activeMedicationId can be null or a string
  if (s.activeMedicationId !== null && typeof s.activeMedicationId !== 'string') return false;

  // currentDose can be null or a positive number
  if (s.currentDose !== null && (typeof s.currentDose !== 'number' || s.currentDose <= 0)) return false;

  return true;
}

// Valid chart views and types
const VALID_CHART_VIEWS: ChartView[] = ['weight', 'water', 'steps', 'pressure', 'medication', 'injections', 'bodyfat'];
const VALID_CHART_TYPES: ChartType[] = ['line', 'bar'];

// Validate a single chart combination
function isValidChartCombination(combo: unknown): combo is ChartCombination {
  if (!combo || typeof combo !== 'object') return false;
  const c = combo as Record<string, unknown>;

  if (typeof c.id !== 'string' || c.id.trim() === '') return false;
  if (typeof c.name !== 'string' || c.name.trim() === '') return false;
  if (typeof c.icon !== 'string' || c.icon.trim() === '') return false;
  if (!Array.isArray(c.charts) || c.charts.length === 0) return false;
  if (!c.charts.every((chart: unknown) => typeof chart === 'string' && VALID_CHART_VIEWS.includes(chart as ChartView))) return false;
  if (typeof c.chartType !== 'string' || !VALID_CHART_TYPES.includes(c.chartType as ChartType)) return false;
  if (typeof c.enabled !== 'boolean') return false;
  if (typeof c.order !== 'number' || c.order < 0) return false;

  // Optional: validate injectionMedicationIds if present
  if (c.injectionMedicationIds !== undefined) {
    if (!Array.isArray(c.injectionMedicationIds)) return false;
    if (!c.injectionMedicationIds.every((id: unknown) => typeof id === 'string')) return false;
  }

  return true;
}

// Validate a single body measurement preset
function isValidBodyMeasurementPreset(preset: unknown): preset is BodyMeasurementPreset {
  if (!preset || typeof preset !== 'object') return false;
  const p = preset as Record<string, unknown>;

  if (typeof p.id !== 'string' || p.id.trim() === '') return false;
  if (typeof p.label !== 'string' || p.label.trim() === '') return false;
  if (typeof p.color !== 'string' || p.color.trim() === '') return false;
  if (typeof p.order !== 'number' || p.order < 0) return false;

  return true;
}

// Validate body measurement presets array
function isValidBodyMeasurementPresetsArray(presets: unknown): presets is BodyMeasurementPreset[] {
  if (!Array.isArray(presets)) return false;
  if (presets.length > MAX_BODY_MEASUREMENT_PRESETS) return false;

  if (!presets.every(isValidBodyMeasurementPreset)) return false;

  // Unique IDs
  const ids = presets.map((p) => p.id);
  if (new Set(ids).size !== ids.length) return false;

  return true;
}

// Validate measurement unit
function isValidMeasurementUnit(unit: unknown): unit is MeasurementUnit {
  return unit === 'cm' || unit === 'in';
}

// Validate chart combinations array
function isValidChartCombinationsArray(combos: unknown): combos is ChartCombination[] {
  if (!Array.isArray(combos)) return false;
  if (combos.length === 0) return false;

  // Check all combinations are valid
  if (!combos.every(isValidChartCombination)) return false;

  // Check for unique IDs
  const ids = combos.map((c) => c.id);
  if (new Set(ids).size !== ids.length) return false;

  return true;
}

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const settings = await getSettings(session.username);

    const response: ApiResponse<UserSettings> = {
      success: true,
      data: settings
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { unit, waterUnit, targetWeight, chartColor, dateFormat, activities, waterPresets, medicationPresets, injectionSettings, goals, features, showQuotes, chartCombinations, bodyMeasurementPresets, measurementUnit, language, buttonBarOrder, customButtonOrder } = body;

    // Validate unit if provided
    if (unit !== undefined && !['kg', 'lb'].includes(unit)) {
      return NextResponse.json(
        { success: false, error: 'Invalid unit value. Must be "kg" or "lb"' },
        { status: 400 }
      );
    }

    // Validate waterUnit if provided
    if (waterUnit !== undefined && !['ml', 'oz'].includes(waterUnit)) {
      return NextResponse.json(
        { success: false, error: 'Invalid water unit value. Must be "ml" or "oz"' },
        { status: 400 }
      );
    }

    // Validate targetWeight if provided
    if (targetWeight !== undefined && targetWeight !== null) {
      if (typeof targetWeight !== 'number' || targetWeight <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid target weight value' },
          { status: 400 }
        );
      }
    }

    // Validate chartColor if provided
    const validChartColors = ['primary', 'blue', 'green', 'orange', 'purple'];
    if (chartColor !== undefined && !validChartColors.includes(chartColor)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chart color value' },
        { status: 400 }
      );
    }

    // Validate dateFormat if provided
    if (dateFormat !== undefined && !isValidDateFormatSettings(dateFormat)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format settings' },
        { status: 400 }
      );
    }

    // Validate activities if provided
    if (activities !== undefined && !isValidActivitiesArray(activities)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activities. Must have 1-12 activities with unique IDs and valid icons.' },
        { status: 400 }
      );
    }

    // Validate water presets if provided
    if (waterPresets !== undefined && !isValidWaterPresetsArray(waterPresets)) {
      return NextResponse.json(
        { success: false, error: 'Invalid water presets. Must have 1-6 presets with unique IDs and valid icons.' },
        { status: 400 }
      );
    }

    // Validate medication presets if provided
    if (medicationPresets !== undefined && !isValidMedicationPresetsArray(medicationPresets)) {
      return NextResponse.json(
        { success: false, error: 'Invalid medication presets. Must have 0-8 presets with unique IDs and valid icons.' },
        { status: 400 }
      );
    }

    // Validate goals if provided
    if (goals !== undefined && !isValidGoalSettings(goals)) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal settings' },
        { status: 400 }
      );
    }

    // Validate features if provided
    if (features !== undefined && !isValidFeatureToggles(features)) {
      return NextResponse.json(
        { success: false, error: 'Invalid feature toggles' },
        { status: 400 }
      );
    }

    // Validate showQuotes if provided
    if (showQuotes !== undefined && typeof showQuotes !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid showQuotes value. Must be a boolean' },
        { status: 400 }
      );
    }

    // Validate injectionSettings if provided
    if (injectionSettings !== undefined && !isValidInjectionSettings(injectionSettings)) {
      return NextResponse.json(
        { success: false, error: 'Invalid injection settings' },
        { status: 400 }
      );
    }

    // Validate chartCombinations if provided
    if (chartCombinations !== undefined && !isValidChartCombinationsArray(chartCombinations)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chart combinations' },
        { status: 400 }
      );
    }

    // Validate bodyMeasurementPresets if provided
    if (bodyMeasurementPresets !== undefined && !isValidBodyMeasurementPresetsArray(bodyMeasurementPresets)) {
      return NextResponse.json(
        { success: false, error: `Invalid body measurement presets. Max ${MAX_BODY_MEASUREMENT_PRESETS}, unique IDs, non-empty labels.` },
        { status: 400 }
      );
    }

    // Validate measurementUnit if provided
    if (measurementUnit !== undefined && !isValidMeasurementUnit(measurementUnit)) {
      return NextResponse.json(
        { success: false, error: 'Invalid measurement unit. Must be "cm" or "in"' },
        { status: 400 }
      );
    }

    // Validate language if provided (must match an available dictionary file)
    if (language !== undefined) {
      const available = await getAvailableLanguages();
      if (typeof language !== 'string' || !available.includes(language)) {
        return NextResponse.json(
          { success: false, error: 'Invalid language. Must match an available dictionary.' },
          { status: 400 }
        );
      }
    }

    // Validate buttonBarOrder if provided
    if (buttonBarOrder !== undefined && !['default', 'chart', 'custom'].includes(buttonBarOrder)) {
      return NextResponse.json(
        { success: false, error: 'Invalid button bar order. Must be "default", "chart" or "custom".' },
        { status: 400 }
      );
    }

    // Validate customButtonOrder if provided (array of known button keys)
    if (customButtonOrder !== undefined) {
      const validKeys: ActionButtonKey[] = DEFAULT_ACTION_BUTTON_ORDER;
      if (
        !Array.isArray(customButtonOrder) ||
        !customButtonOrder.every((k: unknown) => typeof k === 'string' && validKeys.includes(k as ActionButtonKey)) ||
        new Set(customButtonOrder).size !== customButtonOrder.length
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid custom button order.' },
          { status: 400 }
        );
      }
    }

    // Only include defined values to avoid overwriting with undefined
    const updateData: Partial<UserSettings> = {};
    if (unit !== undefined) updateData.unit = unit;
    if (waterUnit !== undefined) updateData.waterUnit = waterUnit;
    if (targetWeight !== undefined) updateData.targetWeight = targetWeight;
    if (chartColor !== undefined) updateData.chartColor = chartColor;
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
    if (activities !== undefined) updateData.activities = activities;
    if (waterPresets !== undefined) updateData.waterPresets = waterPresets;
    if (medicationPresets !== undefined) updateData.medicationPresets = medicationPresets;
    if (goals !== undefined) updateData.goals = goals;
    if (features !== undefined) updateData.features = features;
    if (showQuotes !== undefined) updateData.showQuotes = showQuotes;
    if (injectionSettings !== undefined) updateData.injectionSettings = injectionSettings;
    if (chartCombinations !== undefined) updateData.chartCombinations = chartCombinations;
    if (bodyMeasurementPresets !== undefined) updateData.bodyMeasurementPresets = bodyMeasurementPresets;
    if (measurementUnit !== undefined) updateData.measurementUnit = measurementUnit;
    if (language !== undefined) updateData.language = language;
    if (buttonBarOrder !== undefined) updateData.buttonBarOrder = buttonBarOrder as ButtonBarOrderMode;
    if (customButtonOrder !== undefined) updateData.customButtonOrder = customButtonOrder as ActionButtonKey[];

    const updated = await updateSettings(
      updateData,
      session.username
    );

    const response: ApiResponse<UserSettings> = {
      success: true,
      data: updated
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
