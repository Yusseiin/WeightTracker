'use client';

import { LucideProps } from 'lucide-react';
import {
  // Fitness
  Dumbbell,
  Activity,
  Heart,
  Flame,
  Zap,
  Timer,
  Trophy,
  Medal,
  Target,
  TrendingUp,
  // Sports
  Bike,
  Waves,
  Mountain,
  Footprints,
  PersonStanding,
  Snowflake,
  Tent,
  TreePine,
  Compass,
  Map,
  // Rest & Wellness
  Sofa,
  Moon,
  Sun,
  Coffee,
  Bed,
  Bath,
  Sparkles,
  Wind,
  Cloud,
  Leaf,
  // General
  Star,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Plus,
  Check,
  X,
  Bookmark,
  Flag,
  // Fallback
  HelpCircle,
} from 'lucide-react';
import { ComponentType } from 'react';

// Map of icon names to components
const iconMap: Record<string, ComponentType<LucideProps>> = {
  // Fitness
  Dumbbell,
  Activity,
  Heart,
  Flame,
  Zap,
  Timer,
  Trophy,
  Medal,
  Target,
  TrendingUp,
  // Sports
  Bike,
  Waves,
  Mountain,
  Footprints,
  PersonStanding,
  Snowflake,
  Tent,
  TreePine,
  Compass,
  Map,
  // Rest & Wellness
  Sofa,
  Moon,
  Sun,
  Coffee,
  Bed,
  Bath,
  Sparkles,
  Wind,
  Cloud,
  Leaf,
  // General
  Star,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Plus,
  Check,
  X,
  Bookmark,
  Flag,
};

interface DynamicIconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const IconComponent = iconMap[name] || HelpCircle;
  return <IconComponent {...props} />;
}

// Export the icon map for use in icon picker
export { iconMap };
