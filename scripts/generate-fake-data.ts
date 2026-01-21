/**
 * Generate fake data for testing the WeightTracker app
 *
 * Run with: npx tsx scripts/generate-fake-data.ts
 *
 * Data is written to ./config directory
 */

import { promises as fs } from 'fs';
import path from 'path';
import { format, subDays, addHours, startOfDay } from 'date-fns';

// Config directory
const CONFIG_PATH = process.env.CONFIG_PATH || './config';
const TEST_USER = 'testuser';

// Helper to generate random number in range
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Helper to generate random integer in range
function randomIntInRange(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

// Helper to pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate unique ID
function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get date string in YYYY-MM-DD format
function getDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Generate weight entries (90 days of data)
function generateWeightEntries() {
  const entries = [];
  const today = new Date();
  let currentWeight = 85; // Starting weight in kg

  // Generate 90 days of weight data (not every day, ~80% of days have entries)
  for (let i = 89; i >= 0; i--) {
    if (Math.random() > 0.2) { // 80% chance of having an entry
      const date = subDays(today, i);
      const timestamp = addHours(startOfDay(date), randomIntInRange(6, 10)); // Morning weigh-in

      // Small random weight fluctuation
      currentWeight += randomInRange(-0.3, 0.2);
      // General downward trend (losing weight)
      currentWeight = Math.max(currentWeight - 0.02, 75);

      entries.push({
        id: generateId(),
        author: TEST_USER,
        weight: Math.round(currentWeight * 10) / 10,
        training: randomPick(['rest', 'weights', 'cardio', 'rest', 'rest']), // More rest days
        sleep: randomPick([0, 0, 1, 1, 2]) as 0 | 1 | 2, // Mostly good/fair sleep
        timestamp: timestamp.toISOString()
      });
    }
  }

  return entries;
}

// Generate water entries (90 days of data)
function generateWaterEntries() {
  const entries = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = getDateStr(date);

    // Random water amount between 1000ml and 3000ml
    const amount = randomIntInRange(1000, 3000);

    entries.push({
      id: generateId('water-'),
      author: TEST_USER,
      date: dateStr,
      amount,
      updatedAt: date.toISOString()
    });
  }

  return entries;
}

// Generate steps entries (90 days of data)
function generateStepsEntries() {
  const entries = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = getDateStr(date);

    // Random steps between 2000 and 15000
    const steps = randomIntInRange(2000, 15000);
    const timestamp = addHours(startOfDay(date), randomIntInRange(18, 22)); // Evening measurement

    entries.push({
      id: generateId('steps-'),
      author: TEST_USER,
      date: dateStr,
      steps,
      timestamp: timestamp.toISOString(),
      updatedAt: timestamp.toISOString()
    });
  }

  return entries;
}

// Generate pressure entries (60 days of data, 1-2 per day)
function generatePressureEntries() {
  const entries = [];
  const today = new Date();

  // Base values with slight variation
  let baseSystolic = 125;
  let baseDiastolic = 82;

  for (let i = 59; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = getDateStr(date);

    // Morning measurement
    const morningTime = addHours(startOfDay(date), randomIntInRange(7, 9));
    entries.push({
      id: generateId('pressure-'),
      author: TEST_USER,
      date: dateStr,
      systolic: Math.round(baseSystolic + randomInRange(-8, 8)),
      diastolic: Math.round(baseDiastolic + randomInRange(-5, 5)),
      timestamp: morningTime.toISOString(),
      updatedAt: morningTime.toISOString()
    });

    // Evening measurement (70% of days)
    if (Math.random() > 0.3) {
      const eveningTime = addHours(startOfDay(date), randomIntInRange(18, 21));
      entries.push({
        id: generateId('pressure-'),
        author: TEST_USER,
        date: dateStr,
        systolic: Math.round(baseSystolic + randomInRange(-10, 5)), // Slightly lower in evening
        diastolic: Math.round(baseDiastolic + randomInRange(-6, 4)),
        timestamp: eveningTime.toISOString(),
        updatedAt: eveningTime.toISOString()
      });
    }

    // Gradual improvement trend
    baseSystolic = Math.max(baseSystolic - 0.1, 115);
    baseDiastolic = Math.max(baseDiastolic - 0.05, 75);
  }

  return entries;
}

// Generate medication entries (30 days of data)
function generateMedicationEntries() {
  const entries = [];
  const today = new Date();
  const medicationIds = ['morning', 'afternoon', 'evening'];

  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = getDateStr(date);

    // For each medication preset
    for (const medId of medicationIds) {
      // 85% compliance rate
      const taken = Math.random() > 0.15;
      const hour = medId === 'morning' ? 8 : medId === 'afternoon' ? 14 : 20;
      const timestamp = addHours(startOfDay(date), hour + randomInRange(-1, 1));

      entries.push({
        id: generateId('med-'),
        author: TEST_USER,
        date: dateStr,
        medicationId: medId,
        taken,
        timestamp: timestamp.toISOString(),
        updatedAt: timestamp.toISOString()
      });
    }
  }

  return entries;
}

// Generate user settings with all features enabled
function generateSettings() {
  return {
    userId: TEST_USER,
    unit: 'kg' as const,
    waterUnit: 'ml' as const,
    targetWeight: 75,
    chartColor: 'blue' as const,
    dateFormat: {
      locale: 'en' as const,
      tableFormat: {
        dateFormat: 'dd/MM/yyyy' as const,
        timeFormat: 'HH:mm' as const,
        showWeekday: true
      },
      tooltipFormat: {
        dateFormat: 'dd MMM yyyy' as const,
        timeFormat: 'HH:mm' as const,
        showWeekday: true
      },
      axisFormat: {
        dateFormat: 'dd/MM' as const,
        timeFormat: 'none' as const,
        showWeekday: false
      }
    },
    activities: [
      { id: 'rest', label: 'Rest', icon: 'Sofa', color: 'text-muted-foreground' },
      { id: 'weights', label: 'Weights', icon: 'Dumbbell', color: 'text-blue-500' },
      { id: 'cardio', label: 'Cardio', icon: 'Activity', color: 'text-green-500' },
    ],
    waterPresets: [
      { id: 'cup', label: 'Cup', icon: 'GlassWater', amount: 200 },
      { id: 'half', label: '0.5L', icon: 'Droplets', amount: 500 },
      { id: 'bottle', label: '0.75L', icon: 'BottleWine', amount: 750 },
      { id: 'liter', label: '1L', icon: 'Milk', amount: 1000 },
    ],
    medicationPresets: [
      { id: 'morning', label: 'Morning', icon: 'Sunrise', color: 'text-orange-500' },
      { id: 'afternoon', label: 'Afternoon', icon: 'Sun', color: 'text-yellow-500' },
      { id: 'evening', label: 'Evening', icon: 'Moon', color: 'text-indigo-500' },
    ],
    goals: {
      dailyWaterGoal: 2500, // 2.5L
      weeklyWeightGoal: -0.5, // Lose 0.5kg per week
      monthlyWeightGoal: -2, // Lose 2kg per month
      weekStartsOn: 1 as const, // Monday
      dailyStepsGoal: 10000 // 10k steps
    },
    features: {
      stepsEnabled: true,
      pressureEnabled: true,
      medicationEnabled: true
    },
    showQuotes: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  console.log('Generating fake data for testing...\n');

  // Create directories
  const dirs = ['entries', 'settings', 'water', 'steps', 'pressure', 'medications'];
  for (const dir of dirs) {
    const dirPath = path.join(CONFIG_PATH, dir);
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }

  // Generate and save weight entries
  const weightEntries = generateWeightEntries();
  await fs.writeFile(
    path.join(CONFIG_PATH, 'entries', `${TEST_USER}.json`),
    JSON.stringify(weightEntries, null, 2)
  );
  console.log(`Generated ${weightEntries.length} weight entries`);

  // Generate and save water entries
  const waterEntries = generateWaterEntries();
  await fs.writeFile(
    path.join(CONFIG_PATH, 'water', `${TEST_USER}.json`),
    JSON.stringify(waterEntries, null, 2)
  );
  console.log(`Generated ${waterEntries.length} water entries`);

  // Generate and save steps entries
  const stepsEntries = generateStepsEntries();
  await fs.writeFile(
    path.join(CONFIG_PATH, 'steps', `${TEST_USER}.json`),
    JSON.stringify(stepsEntries, null, 2)
  );
  console.log(`Generated ${stepsEntries.length} steps entries`);

  // Generate and save pressure entries
  const pressureEntries = generatePressureEntries();
  await fs.writeFile(
    path.join(CONFIG_PATH, 'pressure', `${TEST_USER}.json`),
    JSON.stringify(pressureEntries, null, 2)
  );
  console.log(`Generated ${pressureEntries.length} pressure entries`);

  // Generate and save medication entries
  const medicationEntries = generateMedicationEntries();
  await fs.writeFile(
    path.join(CONFIG_PATH, 'medications', `${TEST_USER}.json`),
    JSON.stringify(medicationEntries, null, 2)
  );
  console.log(`Generated ${medicationEntries.length} medication entries`);

  // Generate and save settings
  const settings = generateSettings();
  await fs.writeFile(
    path.join(CONFIG_PATH, 'settings', `${TEST_USER}.json`),
    JSON.stringify(settings, null, 2)
  );
  console.log(`Generated settings with all features enabled`);

  console.log('\nFake data generation complete!');
  console.log(`\nData written to: ${path.resolve(CONFIG_PATH)}`);
  console.log(`\nTo use this data, set CONFIG_PATH=${path.resolve(CONFIG_PATH)} or copy to /config`);
}

main().catch(console.error);
