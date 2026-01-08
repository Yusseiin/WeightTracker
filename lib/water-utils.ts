import type { WaterUnit } from '@/lib/types';
import { ML_PER_OZ } from '@/lib/types';

// Format water amount for display (client-safe utility)
export function formatWaterAmount(ml: number, unit: WaterUnit = 'ml'): string {
  if (unit === 'oz') {
    const oz = ml / ML_PER_OZ;
    if (oz >= 32) {
      // Show in cups (8oz = 1 cup) for larger amounts
      const cups = oz / 8;
      return `${cups.toFixed(1)} cups`;
    }
    return `${Math.round(oz)}oz`;
  }

  // Metric (ml/L)
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${liters.toFixed(1)}L`;
  }
  return `${ml}ml`;
}

// Convert oz to ml for storage
export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ);
}

// Convert ml to oz for display
export function mlToOz(ml: number): number {
  return ml / ML_PER_OZ;
}

// Get display label for water amounts based on unit
export function getWaterAmountLabel(amountMl: number, unit: WaterUnit): string {
  if (unit === 'oz') {
    const oz = Math.round(amountMl / ML_PER_OZ);
    return `${oz}oz`;
  }
  if (amountMl >= 1000) {
    return `${amountMl / 1000}L`;
  }
  return `${amountMl}ml`;
}
