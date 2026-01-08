"use client";

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { previewFormat } from '@/lib/date-utils';
import type { SingleDateFormat, DateLocale, DateFormatPreset, TimeFormatPreset } from '@/lib/types';

interface DateFormatEditorProps {
  label: string;
  value: SingleDateFormat;
  locale: DateLocale;
  onChange: (value: SingleDateFormat) => void;
}

const DATE_FORMAT_OPTIONS: { value: DateFormatPreset; label: string }[] = [
  { value: 'dd/MM/yyyy', label: '06/01/2025 (EU)' },
  { value: 'MM/dd/yyyy', label: '01/06/2025 (US)' },
  { value: 'yyyy-MM-dd', label: '2025-01-06 (ISO)' },
  { value: 'dd MMM yyyy', label: '06 Jan 2025' },
  { value: 'EEE dd/MM', label: 'Mon 06/01' },
  { value: 'EEE.dd/MM', label: 'Mon.06/01' },
  { value: 'dd/MM', label: '06/01 (short)' },
  { value: 'MMM dd', label: 'Jan 06' },
  { value: 'custom', label: 'Custom...' },
];

const TIME_FORMAT_OPTIONS: { value: TimeFormatPreset; label: string }[] = [
  { value: 'HH:mm', label: '14:30 (24h)' },
  { value: 'hh:mm a', label: '02:30 PM (12h)' },
  { value: 'none', label: 'No time' },
];

export function DateFormatEditor({ label, value, locale, onChange }: DateFormatEditorProps) {
  // Safely preview the format, catching any errors from invalid patterns
  const getPreview = () => {
    try {
      return previewFormat(value, locale);
    } catch {
      return 'Invalid format pattern';
    }
  };

  const handleDateFormatChange = (dateFormat: string) => {
    onChange({ ...value, dateFormat: dateFormat as DateFormatPreset });
  };

  const handleTimeFormatChange = (timeFormat: string) => {
    onChange({ ...value, timeFormat: timeFormat as TimeFormatPreset });
  };

  const handleCustomFormatChange = (customDateFormat: string) => {
    onChange({ ...value, customDateFormat });
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg">
      <div className="font-medium text-sm">{label}</div>

      {/* Date Format */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Date Format</Label>
        <Select value={value.dateFormat} onValueChange={handleDateFormatChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Format Input */}
      {value.dateFormat === 'custom' && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Custom Pattern</Label>
          <Input
            value={value.customDateFormat || ''}
            onChange={(e) => handleCustomFormatChange(e.target.value)}
            placeholder="e.g., dd/MM/yyyy"
            className="h-8"
          />
          <p className="text-xs text-muted-foreground">
            dd=day (use lowercase!), MM=month, yyyy=year, EEE=weekday, HH:mm=time
          </p>
        </div>
      )}

      {/* Time Format */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Time Format</Label>
        <Select value={value.timeFormat} onValueChange={handleTimeFormatChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="p-2 bg-muted rounded text-sm">
        <span className="text-xs text-muted-foreground">Preview: </span>
        {getPreview()}
      </div>
    </div>
  );
}
