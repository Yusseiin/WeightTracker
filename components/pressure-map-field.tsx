"use client";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import { MAP_MIN, MAP_MAX } from '@/lib/pressure-utils';
import { cn } from '@/lib/utils';
import type { useMapInput } from '@/hooks/use-map-input';

type MapField = ReturnType<typeof useMapInput>;

// The MAP input, rendered as a third column next to systolic/diastolic.
export function MapInputCell({ field, id }: { field: MapField; id: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t('pressure.map')}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={field.value}
        placeholder={field.estimate !== null ? String(field.estimate) : t('pressure.mapPlaceholder')}
        onChange={(e) => field.onChange(e.target.value)}
        className={cn('text-lg text-center', !field.isValid && 'border-destructive')}
        aria-invalid={!field.isValid}
        min={MAP_MIN}
        max={MAP_MAX}
      />
    </div>
  );
}

// Explains where MAP comes from, offers to restore the estimate after a manual
// edit, or flags an out-of-range value.
export function MapHint({ field }: { field: MapField }) {
  const { t } = useTranslation();

  if (!field.isValid) {
    return (
      <p className="text-xs text-destructive text-center">
        {t('pressure.mapInvalid', { min: String(MAP_MIN), max: String(MAP_MAX) })}
      </p>
    );
  }

  if (field.isCustom && field.estimate !== null) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        <button
          type="button"
          onClick={field.reset}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {t('pressure.mapReset', { value: String(field.estimate) })}
        </button>
      </p>
    );
  }

  return <p className="text-xs text-muted-foreground text-center">{t('pressure.mapHint')}</p>;
}
