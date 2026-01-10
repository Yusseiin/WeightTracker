"use client";

import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/components/dynamic-icon';
import type { WeightEntry, CustomActivity } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RecentEntriesProps {
  entries: WeightEntry[];
  unit: 'kg' | 'lb';
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
  activities: CustomActivity[];
}

function TrainingIcon({ activityId, activities }: { activityId: string; activities: CustomActivity[] }) {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) {
    return <DynamicIcon name="HelpCircle" className="h-4 w-4 text-muted-foreground" />;
  }
  return <DynamicIcon name={activity.icon} className={cn('h-4 w-4', activity.color)} />;
}

function SleepIndicator({ quality }: { quality: number }) {
  const colors = ['bg-green-500', 'bg-orange-500', 'bg-red-500'];
  return <span className={`w-2.5 h-2.5 rounded-full ${colors[quality]}`} />;
}

function WeightDiff({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;

  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-muted-foreground">(--)</span>;

  const formatted = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  const colorClass = diff > 0 ? 'text-red-500' : 'text-green-500';

  return <span className={`text-xs ${colorClass}`}>({formatted})</span>;
}

export function RecentEntries({ entries, unit, onDelete, isDeleting, activities }: RecentEntriesProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-25 items-center justify-center text-muted-foreground">
            No entries yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent Entries</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ul className="space-y-1">
          {entries.map((entry, index) => {
            const previousEntry = entries[index + 1] || null;
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{entry.weight}</span>
                      <span className="text-sm text-muted-foreground">{unit}</span>
                      <WeightDiff
                        current={entry.weight}
                        previous={previousEntry?.weight ?? null}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.timestamp), 'MMM d, yyyy - HH:mm')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <TrainingIcon activityId={entry.training} activities={activities} />
                    <SleepIndicator quality={entry.sleep} />
                  </div>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(entry.id)}
                      disabled={isDeleting === entry.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete entry</span>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
