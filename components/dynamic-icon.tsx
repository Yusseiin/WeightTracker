'use client';

import { LucideProps, Icon, type IconNode } from 'lucide-react';
import { rugby } from '@lucide/lab';
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
  Volleyball,
  FishingHook,
  HandFist,
  WavesLadder,
  BowArrow,
  Sword,
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
  // Water presets
  Droplets,
  GlassWater,
  Milk,
  BottleWine,
  Beer,
  CupSoda,
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
  // Medical
  Pill,
  Tablets,
  Syringe,
  Stethoscope,
  HeartPulse,
  Thermometer,
  Bandage,
  TestTube,
  Microscope,
  Brain,
  Eye,
  Ear,
  Hand,
  Bone,
  Droplet,
  CircleDot,
  Clock,
  Sunrise,
  Sunset,
  AlarmClock,
  Percent,
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
  Volleyball,
  FishingHook,
  HandFist,
  WavesLadder,
  BowArrow,
  Sword,
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
  // Water presets
  Droplets,
  GlassWater,
  Milk,
  BottleWine,
  Beer,
  CupSoda,
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
  // Medical
  Pill,
  Tablets,
  Syringe,
  Stethoscope,
  HeartPulse,
  Thermometer,
  Bandage,
  TestTube,
  Microscope,
  Brain,
  Eye,
  Ear,
  Hand,
  Bone,
  Droplet,
  CircleDot,
  Clock,
  Sunrise,
  Sunset,
  AlarmClock,
  Percent,
};

// Lab icons (IconNode data, rendered via <Icon>)
const labIconMap: Record<string, IconNode> = {
  Rugby: rugby,
};

interface DynamicIconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const labIcon = labIconMap[name];
  if (labIcon) {
    return <Icon iconNode={labIcon} {...props} />;
  }
  const IconComponent = iconMap[name] || HelpCircle;
  return <IconComponent {...props} />;
}

// Export the icon maps for use in icon picker
export { iconMap, labIconMap };
