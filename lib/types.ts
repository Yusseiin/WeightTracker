// Weight entry data model
export interface WeightEntry {
  id: string;
  author: string;           // For future multi-user support
  weight: number;
  training: 0 | 1 | 2;      // 0=rest, 1=weights, 2=cardio
  sleep: 0 | 1 | 2;         // 0=good (green), 1=fair (orange), 2=poor (red)
  timestamp: string;        // ISO 8601 format
}

// Chart color options
export type ChartColor = 'primary' | 'blue' | 'green' | 'orange' | 'purple';

// Water unit options
export type WaterUnit = 'ml' | 'oz';

// Available date format presets
export type DateFormatPreset =
  | 'dd/MM/yyyy'       // 06/01/2025 (EU)
  | 'MM/dd/yyyy'       // 01/06/2025 (US)
  | 'yyyy-MM-dd'       // 2025-01-06 (ISO)
  | 'dd MMM yyyy'      // 06 Jan 2025
  | 'EEE dd/MM'        // Mon 06/01
  | 'EEE.dd/MM'        // Mon.06/01
  | 'dd/MM'            // 06/01 (short)
  | 'MMM dd'           // Jan 06
  | 'custom';          // User-defined pattern

// Available time format options
export type TimeFormatPreset = 'HH:mm' | 'hh:mm a' | 'none';

// Available locales for weekday/month names
export type DateLocale = 'en' | 'it' | 'de' | 'fr' | 'es';

// Single date format setting
export interface SingleDateFormat {
  dateFormat: DateFormatPreset;
  customDateFormat?: string;      // Only used when dateFormat === 'custom'
  timeFormat: TimeFormatPreset;
  showWeekday: boolean;           // Prepend weekday (Mon, Tue, etc.)
}

// All 3 date format settings
export interface DateFormatSettings {
  locale: DateLocale;             // Shared locale for all formats
  tableFormat: SingleDateFormat;  // Format for history table
  tooltipFormat: SingleDateFormat; // Format for chart tooltip
  axisFormat: SingleDateFormat;   // Format for chart X-axis
}

// User settings model
export interface UserSettings {
  userId: string;
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  targetWeight: number | null;
  chartColor: ChartColor;
  dateFormat: DateFormatSettings;
  createdAt: string;
  updatedAt: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Time filter options for chart
export type TimeFilter = 'all' | '1m' | '3m' | '6m';

// Training type configuration
export const TRAINING_TYPES = {
  0: { label: 'Rest', icon: 'Sofa' },
  1: { label: 'Weights', icon: 'Dumbbell' },
  2: { label: 'Cardio', icon: 'Activity' }
} as const;

// Sleep quality configuration
export const SLEEP_QUALITY = {
  0: { label: 'Good', color: 'green' },
  1: { label: 'Fair', color: 'orange' },
  2: { label: 'Poor', color: 'red' }
} as const;

// Form data for creating/editing entries
export interface EntryFormData {
  weight: number;
  training: 0 | 1 | 2;
  sleep: 0 | 1 | 2;
  timestamp: string;
}

// User roles
export type UserRole = 'admin' | 'user';

// User model (stored in users.json)
export interface User {
  username: string;
  password: string;
  nickname: string;
  role: UserRole;
  createdAt: string;
}

// Session user (stored in cookie, no password)
export interface SessionUser {
  username: string;
  nickname: string;
  role: UserRole;
}

// Request for creating new users (admin only)
export interface CreateUserRequest {
  username: string;
  password: string;
  nickname: string;
  role: UserRole;
}

// Request for changing password
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Session cookie name
export const SESSION_COOKIE_NAME = 'weight-tracker-session';

// Default user ID for single-user mode (deprecated, kept for backwards compatibility)
export const DEFAULT_USER_ID = 'default';

// Water consumption entry (one per day)
export interface WaterEntry {
  id: string;
  author: string;
  date: string;        // YYYY-MM-DD format (one entry per day)
  amount: number;      // Total ml for the day
  updatedAt: string;   // ISO 8601
}

// Water amount options in ml (stored internally always in ml)
export const WATER_AMOUNTS = {
  cup: 200,       // 200ml / ~7oz
  halfLiter: 500, // 0.5L / ~17oz
  liter: 1000,    // 1L / ~34oz
} as const;

// Water amount options in oz for imperial display
export const WATER_AMOUNTS_OZ = {
  cup: 8,         // 8oz (~237ml, standard US cup)
  halfLiter: 17,  // ~17oz (~500ml)
  liter: 34,      // ~34oz (~1L)
} as const;

// Conversion constants
export const ML_PER_OZ = 29.5735;
