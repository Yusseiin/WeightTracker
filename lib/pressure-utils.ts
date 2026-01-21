// Client-safe pressure utility functions

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
