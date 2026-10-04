// Client-safe pressure utility functions

// Plausible bounds for a MAP value entered by hand (mmHg).
export const MAP_MIN = 30;
export const MAP_MAX = 300;

// Estimated mean arterial pressure: MAP = (SYS + 2 x DIA) / 3, rounded to a
// whole mmHg like the readings it is derived from. Home cuffs don't report MAP,
// so this is the standard estimate rather than a measured value.
export function estimateMap(systolic: number, diastolic: number): number {
  return Math.round((systolic + 2 * diastolic) / 3);
}

export function isValidMap(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MAP_MIN && value <= MAP_MAX;
}

// Format pressure for display
export function formatPressure(systolic: number, diastolic: number): string {
  return `${systolic}/${diastolic}`;
}

// Get blood pressure category based on AHA guidelines
// Normal: < 120 AND < 80
// Elevated: 120-129 AND < 80
// High Stage 1: 130-139 OR 80-89
// High Stage 2: >= 140 OR >= 90
export function getPressureCategory(systolic: number, diastolic: number): {
  label: string;
  color: string;
} {
  if (systolic >= 140 || diastolic >= 90) {
    return { label: 'High Stage 2', color: 'text-red-500' };
  } else if (systolic >= 130 || diastolic >= 80) {
    return { label: 'High Stage 1', color: 'text-orange-500' };
  } else if (systolic >= 120 && diastolic < 80) {
    return { label: 'Elevated', color: 'text-yellow-500' };
  } else if (systolic < 120 && diastolic < 80) {
    return { label: 'Normal', color: 'text-green-500' };
  }
  return { label: 'Unknown', color: 'text-muted-foreground' };
}
