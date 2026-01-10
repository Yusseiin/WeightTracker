// Curated list of Lucide icons for activity selection
// Organized by category for easier browsing

export interface IconCategory {
  name: string;
  icons: string[];
}

export const ACTIVITY_ICON_CATEGORIES: IconCategory[] = [
  {
    name: 'Fitness',
    icons: [
      'Dumbbell',
      'Activity',
      'Heart',
      'Flame',
      'Zap',
      'Timer',
      'Trophy',
      'Medal',
      'Target',
      'TrendingUp',
    ],
  },
  {
    name: 'Sports',
    icons: [
      'Bike',
      'Waves',
      'Mountain',
      'Footprints',
      'PersonStanding',
      'Snowflake',
      'Tent',
      'TreePine',
      'Compass',
      'Map',
    ],
  },
  {
    name: 'Rest & Wellness',
    icons: [
      'Sofa',
      'Moon',
      'Sun',
      'Coffee',
      'Bed',
      'Bath',
      'Sparkles',
      'Wind',
      'Cloud',
      'Leaf',
    ],
  },
  {
    name: 'General',
    icons: [
      'Star',
      'Circle',
      'Square',
      'Triangle',
      'Hexagon',
      'Plus',
      'Check',
      'X',
      'Bookmark',
      'Flag',
    ],
  },
];

// Flat list of all available icons for validation
export const ALL_ACTIVITY_ICONS: string[] = ACTIVITY_ICON_CATEGORIES.flatMap(
  (category) => category.icons
);

// Color options for activities
export interface ActivityColor {
  name: string;
  value: string;           // Tailwind class
  preview: string;         // Hex for preview
}

export const ACTIVITY_COLORS: ActivityColor[] = [
  { name: 'Gray', value: 'text-muted-foreground', preview: '#71717a' },
  { name: 'Blue', value: 'text-blue-500', preview: '#3b82f6' },
  { name: 'Green', value: 'text-green-500', preview: '#22c55e' },
  { name: 'Red', value: 'text-red-500', preview: '#ef4444' },
  { name: 'Orange', value: 'text-orange-500', preview: '#f97316' },
  { name: 'Yellow', value: 'text-yellow-500', preview: '#eab308' },
  { name: 'Purple', value: 'text-purple-500', preview: '#a855f7' },
  { name: 'Pink', value: 'text-pink-500', preview: '#ec4899' },
  { name: 'Cyan', value: 'text-cyan-500', preview: '#06b6d4' },
  { name: 'Indigo', value: 'text-indigo-500', preview: '#6366f1' },
];
