// Weight entry data model
export interface WeightEntry {
  id: string;
  author: string;           // For future multi-user support
  weight: number;
  training: string;         // Activity ID (e.g., 'rest', 'weights', 'cardio', or custom IDs)
  sleep: 0 | 1 | 2;         // 0=good (green), 1=fair (orange), 2=poor (red)
  timestamp: string;        // ISO 8601 format
}

// Custom activity configuration
export interface CustomActivity {
  id: string;               // Unique identifier (e.g., 'rest', 'weights', 'act_abc123')
  label: string;            // User-defined name (e.g., 'Swimming')
  icon: string;             // Lucide icon name (e.g., 'Waves')
  color: string;            // Tailwind color class (e.g., 'text-cyan-500')
}

// Maximum number of activities per user
export const MAX_ACTIVITIES = 12;

// Default activities for new users
export const DEFAULT_ACTIVITIES: CustomActivity[] = [
  { id: 'rest', label: 'Rest', icon: 'Sofa', color: 'text-muted-foreground' },
  { id: 'weights', label: 'Weights', icon: 'Dumbbell', color: 'text-blue-500' },
  { id: 'cardio', label: 'Cardio', icon: 'Activity', color: 'text-green-500' },
];

// Water preset configuration
export interface WaterPreset {
  id: string;           // Unique identifier (e.g., 'wp_abc123')
  label: string;        // User-defined name (e.g., 'Cup', 'Bottle')
  icon: string;         // Lucide icon name (e.g., 'GlassWater', 'Milk')
  amount: number;       // Amount in ml (always stored in ml)
}

// Maximum number of water presets
export const MAX_WATER_PRESETS = 6;

// Medication preset configuration
export interface MedicationPreset {
  id: string;               // Unique identifier (e.g., 'med_abc123')
  label: string;            // User-defined name (e.g., 'Morning pill', 'Evening vitamin')
  icon: string;             // Lucide icon name (e.g., 'Pill', 'Syringe')
  color: string;            // Tailwind color class (e.g., 'text-purple-500')
}

// Maximum number of medication presets
export const MAX_MEDICATIONS = 8;

// Default medication presets for new users
export const DEFAULT_MEDICATION_PRESETS: MedicationPreset[] = [
  { id: 'morning', label: 'Morning', icon: 'Sunrise', color: 'text-orange-500' },
  { id: 'afternoon', label: 'Afternoon', icon: 'Sun', color: 'text-yellow-500' },
  { id: 'evening', label: 'Evening', icon: 'Moon', color: 'text-indigo-500' },
];

// Default water presets for new users
export const DEFAULT_WATER_PRESETS: WaterPreset[] = [
  { id: 'cup', label: 'Cup', icon: 'GlassWater', amount: 200 },
  { id: 'half', label: '0.5L', icon: 'Droplets', amount: 500 },
  { id: 'bottle', label: '0.75L', icon: 'BottleWine', amount: 750 },
  { id: 'liter', label: '1L', icon: 'Milk', amount: 1000 },
];

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

// All date format settings
export interface DateFormatSettings {
  locale: DateLocale;             // Shared locale for all formats
  tableFormat: SingleDateFormat;  // Format for history table
  tooltipFormat: SingleDateFormat; // Format for chart tooltip
  axisFormat: SingleDateFormat;   // Format for chart X-axis
}

// Week start day options (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Day names for week start selection
export const WEEK_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

// Goal settings for gamification
export interface GoalSettings {
  dailyWaterGoal: number | null;    // Daily water goal in ml, null = no goal
  weeklyWeightGoal: number | null;  // Weekly weight change in kg (negative = lose, positive = gain)
  monthlyWeightGoal: number | null; // Monthly weight change in kg
  weekStartsOn: WeekStartsOn;       // When the week starts (0 = Sunday, 1 = Monday)
  dailyStepsGoal: number | null;    // Daily steps goal, null = no goal
}

// Optional feature toggles
export interface FeatureToggles {
  stepsEnabled: boolean;            // Show steps tracking button
  pressureEnabled: boolean;         // Show blood pressure tracking button
  medicationEnabled: boolean;       // Show medication tracking button
}

// Default goal settings
export const DEFAULT_GOALS: GoalSettings = {
  dailyWaterGoal: null,
  weeklyWeightGoal: null,
  monthlyWeightGoal: null,
  weekStartsOn: 1, // Monday by default
  dailyStepsGoal: null,
};

// Default feature toggles
export const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  stepsEnabled: false,
  pressureEnabled: false,
  medicationEnabled: false,
};

// User settings model
export interface UserSettings {
  userId: string;
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  targetWeight: number | null;
  chartColor: ChartColor;
  dateFormat: DateFormatSettings;
  activities: CustomActivity[];   // User's custom activities (max 12)
  waterPresets: WaterPreset[];    // User's custom water presets (max 6)
  medicationPresets: MedicationPreset[]; // User's custom medication presets (max 8)
  goals: GoalSettings;            // Gamification goals
  features: FeatureToggles;       // Optional feature toggles
  showQuotes: boolean;            // Show motivational quotes
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
  training: string;         // Activity ID
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
  cup: 200,            // 200ml / ~7oz
  halfLiter: 500,      // 0.5L / ~17oz
  threeQuarters: 750,  // 0.75L / ~25oz
  liter: 1000,         // 1L / ~34oz
} as const;

// Water amount options in oz for imperial display
export const WATER_AMOUNTS_OZ = {
  cup: 8,              // 8oz (~237ml, standard US cup)
  halfLiter: 17,       // ~17oz (~500ml)
  threeQuarters: 25,   // ~25oz (~750ml)
  liter: 34,           // ~34oz (~1L)
} as const;

// Conversion constants
export const ML_PER_OZ = 29.5735;

// Steps entry (one per day, max 5 digits)
export interface StepsEntry {
  id: string;
  author: string;
  date: string;        // YYYY-MM-DD format (one entry per day)
  steps: number;       // Max 99999 (5 digits)
  timestamp: string;   // ISO 8601 - time of measurement (can be edited independently)
  updatedAt: string;   // ISO 8601
}

// Blood pressure entry (multiple per day)
export interface PressureEntry {
  id: string;
  author: string;
  date: string;        // YYYY-MM-DD format
  systolic: number;    // Upper value (e.g., 120)
  diastolic: number;   // Lower value (e.g., 80)
  timestamp: string;   // ISO 8601 - time of measurement (can be edited independently)
  updatedAt: string;   // ISO 8601
}

// Medication entry (tracking whether medications were taken)
export interface MedicationEntry {
  id: string;
  author: string;
  date: string;        // YYYY-MM-DD format
  medicationId: string; // References MedicationPreset.id
  taken: boolean;      // Whether the medication was taken
  timestamp: string;   // ISO 8601 - time when marked
  updatedAt: string;   // ISO 8601
}
