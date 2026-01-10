import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/data';
import { getSession } from '@/lib/auth';
import { ApiResponse, UserSettings, DateFormatSettings, SingleDateFormat, CustomActivity, MAX_ACTIVITIES } from '@/lib/types';
import { ALL_ACTIVITY_ICONS } from '@/lib/icons';

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
    const { unit, waterUnit, targetWeight, chartColor, dateFormat, activities } = body;

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
        { success: false, error: 'Invalid activities. Must have 1-10 activities with unique IDs and valid icons.' },
        { status: 400 }
      );
    }

    // Only include defined values to avoid overwriting with undefined
    const updateData: Partial<UserSettings> = {};
    if (unit !== undefined) updateData.unit = unit;
    if (waterUnit !== undefined) updateData.waterUnit = waterUnit;
    if (targetWeight !== undefined) updateData.targetWeight = targetWeight;
    if (chartColor !== undefined) updateData.chartColor = chartColor;
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
    if (activities !== undefined) updateData.activities = activities;

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
