import type { WaterUnit } from '@/lib/types';
import { ML_PER_OZ } from '@/lib/types';

// Trim trailing zeros from a fixed-precision number ("16.90" → "16.9", "16.00" → "16")
function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

// Format water amount for display (client-safe utility)
export function formatWaterAmount(ml: number, unit: WaterUnit = 'ml'): string {
  if (unit === 'oz') {
    return `${trimZeros((ml / ML_PER_OZ).toFixed(2))}oz`;
  }

  // Metric (ml/L)
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${liters.toFixed(1)}L`;
  }
  return `${ml}ml`;
}

// Convert oz to ml for storage — no rounding, so round-trip through mlToOz
// preserves the value the user entered (e.g. 16.9 oz -> 499.79215 ml -> 16.9 oz).
// Legacy int-ml values keep working since ints are valid floats.
export function ozToMl(oz: number): number {
  return oz * ML_PER_OZ;
}

// Convert ml to oz for display
export function mlToOz(ml: number): number {
  return ml / ML_PER_OZ;
}

// Get display label for water amounts based on unit
export function getWaterAmountLabel(amountMl: number, unit: WaterUnit): string {
  if (unit === 'oz') {
    return `${trimZeros((amountMl / ML_PER_OZ).toFixed(2))}oz`;
  }
  if (amountMl >= 1000) {
    return `${amountMl / 1000}L`;
  }
  return `${amountMl}ml`;
}

// Validation helper: returns error message or null if valid.
// Accepts up to 2 decimal places, positive, finite.
export function validateWaterAmountInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Enter an amount';
  const num = parseFloat(trimmed);
  if (!Number.isFinite(num) || num <= 0) return 'Must be greater than 0';
  // Reject strings with more than 2 decimal digits
  if (/\.\d{3,}$/.test(trimmed)) return 'Max 2 decimal places';
  return null;
}
