"use client";

import { Scale, Droplets, Footprints, HeartPulse, Pill, Syringe, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_ACTION_BUTTON_ORDER,
  ACTION_BUTTON_TO_CHART_ID,
  DEFAULT_CHART_COMBINATIONS,
  type FeatureToggles,
  type ActionButtonKey,
  type ButtonBarOrderMode,
  type ChartCombination,
} from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';

interface FloatingButtonBarProps {
  onWeightClick: () => void;
  onWaterClick: () => void;
  onStepsClick?: () => void;
  onPressureClick?: () => void;
  onMedicationClick?: () => void;
  onInjectionClick?: () => void;
  onBodyMeasurementsClick?: () => void;
  features?: FeatureToggles;
  buttonBarOrder?: ButtonBarOrderMode;
  customButtonOrder?: ActionButtonKey[];
  chartCombinations?: ChartCombination[];
}

interface ButtonDef {
  key: ActionButtonKey;
  enabled: boolean;
  onClick?: () => void;
  icon: LucideIcon;
  labelKey: string;
  primary?: boolean;   // weight is the larger, filled primary action
  border: string;      // outline colour (ignored for primary)
  iconColor: string;
}

// Compute the display order of the button keys based on the chosen mode.
function orderedKeys(
  mode: ButtonBarOrderMode,
  customOrder: ActionButtonKey[] | undefined,
  chartCombinations: ChartCombination[] | undefined,
): ActionButtonKey[] {
  if (mode === 'custom') {
    const custom = (customOrder && customOrder.length > 0 ? customOrder : DEFAULT_ACTION_BUTTON_ORDER)
      .filter((k) => DEFAULT_ACTION_BUTTON_ORDER.includes(k));
    // Append any keys missing from the custom list so nothing disappears.
    return [...custom, ...DEFAULT_ACTION_BUTTON_ORDER.filter((k) => !custom.includes(k))];
  }

  if (mode === 'chart') {
    // Fall back to the default chart set when the user hasn't customized charts,
    // matching what the chart metric selector shows.
    const combos = (chartCombinations && chartCombinations.length > 0)
      ? chartCombinations
      : DEFAULT_CHART_COMBINATIONS;
    const chartOrder = new Map<string, number>();
    combos.forEach((c) => chartOrder.set(c.id, c.order));
    const rank = (key: ActionButtonKey): number => {
      const chartId = ACTION_BUTTON_TO_CHART_ID[key];
      if (chartId && chartOrder.has(chartId)) return chartOrder.get(chartId)!;
      // Buttons with no matching chart (e.g. body measurements) go after the charted ones,
      // keeping their default relative order.
      return 1000 + DEFAULT_ACTION_BUTTON_ORDER.indexOf(key);
    };
    return [...DEFAULT_ACTION_BUTTON_ORDER].sort((a, b) => rank(a) - rank(b));
  }

  // default
  return DEFAULT_ACTION_BUTTON_ORDER;
}

export function FloatingButtonBar({
  onWeightClick,
  onWaterClick,
  onStepsClick,
  onPressureClick,
  onMedicationClick,
  onInjectionClick,
  onBodyMeasurementsClick,
  features,
  buttonBarOrder = 'default',
  customButtonOrder,
  chartCombinations,
}: FloatingButtonBarProps) {
  const { t } = useTranslation();

  const waterEnabled = features?.waterEnabled ?? true;
  const stepsEnabled = features?.stepsEnabled ?? false;
  const pressureEnabled = features?.pressureEnabled ?? false;
  const medicationEnabled = features?.medicationEnabled ?? false;
  const injectionsEnabled = features?.injectionsEnabled ?? false;
  const bodyMeasurementsEnabled = features?.bodyMeasurementsEnabled ?? false;

  const defs: Record<ActionButtonKey, ButtonDef> = {
    water: {
      key: 'water', enabled: waterEnabled, onClick: onWaterClick, icon: Droplets,
      labelKey: 'dashboard.buttons.addWater', border: 'border-blue-500/50', iconColor: 'text-blue-500',
    },
    steps: {
      key: 'steps', enabled: stepsEnabled && !!onStepsClick, onClick: onStepsClick, icon: Footprints,
      labelKey: 'dashboard.buttons.addSteps', border: 'border-green-500/50', iconColor: 'text-green-500',
    },
    weight: {
      key: 'weight', enabled: true, onClick: onWeightClick, icon: Scale, primary: true,
      labelKey: 'dashboard.buttons.addWeight', border: '', iconColor: '',
    },
    pressure: {
      key: 'pressure', enabled: pressureEnabled && !!onPressureClick, onClick: onPressureClick, icon: HeartPulse,
      labelKey: 'dashboard.buttons.addPressure', border: 'border-red-500/50', iconColor: 'text-red-500',
    },
    medication: {
      key: 'medication', enabled: medicationEnabled && !!onMedicationClick, onClick: onMedicationClick, icon: Pill,
      labelKey: 'dashboard.buttons.addMedication', border: 'border-purple-500/50', iconColor: 'text-purple-500',
    },
    injections: {
      key: 'injections', enabled: injectionsEnabled && !!onInjectionClick, onClick: onInjectionClick, icon: Syringe,
      labelKey: 'dashboard.buttons.addInjection', border: 'border-teal-500/50', iconColor: 'text-teal-500',
    },
    bodyMeasurements: {
      key: 'bodyMeasurements', enabled: bodyMeasurementsEnabled && !!onBodyMeasurementsClick, onClick: onBodyMeasurementsClick, icon: Ruler,
      labelKey: 'dashboard.buttons.bodyMeasurements', border: 'border-cyan-500/50', iconColor: 'text-cyan-500',
    },
  };

  const keys = orderedKeys(buttonBarOrder, customButtonOrder, chartCombinations);
  const visible = keys.map((k) => defs[k]).filter((d) => d.enabled);

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg border px-2 py-2" style={{ bottom: '4px' }}>
      {visible.map((def) => {
        const Icon = def.icon;
        if (def.primary) {
          return (
            <Button
              key={def.key}
              size="lg"
              onClick={def.onClick}
              className="rounded-full h-14 w-14"
            >
              <Icon className="h-6 w-6" />
              <span className="sr-only">{t(def.labelKey)}</span>
            </Button>
          );
        }
        return (
          <Button
            key={def.key}
            size="lg"
            variant="outline"
            onClick={def.onClick}
            className={`rounded-full h-12 w-12 ${def.border}`}
          >
            <Icon className={`h-5 w-5 ${def.iconColor}`} />
            <span className="sr-only">{t(def.labelKey)}</span>
          </Button>
        );
      })}
    </div>
  );
}
