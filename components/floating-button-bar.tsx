"use client";

import { Scale, Droplets, Footprints, HeartPulse, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FeatureToggles } from '@/lib/types';

interface FloatingButtonBarProps {
  onWeightClick: () => void;
  onWaterClick: () => void;
  onStepsClick?: () => void;
  onPressureClick?: () => void;
  onMedicationClick?: () => void;
  features?: FeatureToggles;
}

export function FloatingButtonBar({
  onWeightClick,
  onWaterClick,
  onStepsClick,
  onPressureClick,
  onMedicationClick,
  features
}: FloatingButtonBarProps) {
  const stepsEnabled = features?.stepsEnabled ?? false;
  const pressureEnabled = features?.pressureEnabled ?? false;
  const medicationEnabled = features?.medicationEnabled ?? false;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg border px-2 py-2" style={{ bottom: '4px' }}>
      {/* Water button */}
      <Button
        size="lg"
        variant="outline"
        onClick={onWaterClick}
        className="rounded-full h-12 w-12 border-blue-500/50"
      >
        <Droplets className="h-5 w-5 text-blue-500" />
        <span className="sr-only">Add water</span>
      </Button>

      {/* Steps button - only if enabled */}
      {stepsEnabled && onStepsClick && (
        <Button
          size="lg"
          variant="outline"
          onClick={onStepsClick}
          className="rounded-full h-12 w-12 border-green-500/50"
        >
          <Footprints className="h-5 w-5 text-green-500" />
          <span className="sr-only">Add steps</span>
        </Button>
      )}

      {/* Weight button - primary action */}
      <Button
        size="lg"
        onClick={onWeightClick}
        className="rounded-full h-14 w-14"
      >
        <Scale className="h-6 w-6" />
        <span className="sr-only">Add weight entry</span>
      </Button>

      {/* Pressure button - only if enabled */}
      {pressureEnabled && onPressureClick && (
        <Button
          size="lg"
          variant="outline"
          onClick={onPressureClick}
          className="rounded-full h-12 w-12 border-red-500/50"
        >
          <HeartPulse className="h-5 w-5 text-red-500" />
          <span className="sr-only">Add blood pressure</span>
        </Button>
      )}

      {/* Medication button - only if enabled */}
      {medicationEnabled && onMedicationClick && (
        <Button
          size="lg"
          variant="outline"
          onClick={onMedicationClick}
          className="rounded-full h-12 w-12 border-purple-500/50"
        >
          <Pill className="h-5 w-5 text-purple-500" />
          <span className="sr-only">Add medication</span>
        </Button>
      )}
    </div>
  );
}
