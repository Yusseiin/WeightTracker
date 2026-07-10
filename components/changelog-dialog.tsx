"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "added" | "changed" | "fixed" | "removed";
    description: string;
  }[];
}

// Changelog data - add new entries at the top
const changelog: ChangelogEntry[] = [
  {
    version: "v" + process.env.NEXT_PUBLIC_VERSION || "",
    date: "2026-07-07",
    changes: [
      { type: "fixed", description: "The dashboard's 'last weigh-in' date ignored your date settings and always showed the Italian weekday in day/month format. It now uses your configured date locale and format (set them in Settings → Date Format)." },
      { type: "changed", description: "The default date locale is now English (was Italian), matching the default interface language. Existing users keep their saved date settings." },
    ],
  },
  {
    version: "v0.0.24",
    date: "2026-07-07",
    changes: [
      { type: "added", description: "Multi-language support. Pick your language in Settings → Account → Language — English, Italiano and Español are included. The whole interface is translated, and new languages can be added by dropping a JSON file into the dictionary folder and restarting (the app detects available languages automatically)." },
    ],
  },
  {
    version: "v0.0.23",
    date: "2026-07-07",
    changes: [
      { type: "fixed", description: "Water and steps charts were plotting each day's entry on the wrong day (the previous day, around 5pm) for users in non-UTC timezones. Daily entries are now charted on the correct local calendar day, with no phantom time." },
      { type: "fixed", description: "Water chart Y-axis now uses round values in your unit (e.g. 50, 100, 150 oz) instead of awkward numbers like 33.81 oz." },
    ],
  },
  {
    version: "v0.0.22",
    date: "2026-07-06",
    changes: [
      { type: "changed", description: "Water history now groups entries by day: each row shows that day's total, and clicking it expands to reveal the individual entries with their times, each editable/deletable" },
    ],
  },
  {
    version: "v0.0.21",
    date: "2026-07-05",
    changes: [
      { type: "added", description: "Optional water history (Settings → Features → 'Log water as individual entries'): when on, the Add Water dialog lets you pick a date/time and a History tab shows every water entry to edit or delete individually. When off, water works exactly as before (simple daily total)" },
      { type: "changed", description: "Water is now stored internally as individual logged entries (like blood pressure and the other trackers) instead of a single daily total. The daily-recap view is unchanged - it shows the sum of the day's entries. Existing water history is preserved automatically" },
      { type: "added", description: "You can now change your username from Settings → Account. Renaming migrates all of your existing data (weight, water, photos, etc.) to the new username" },
      { type: "added", description: "Added a TZ environment variable to set the server timezone. Set e.g. TZ=America/Los_Angeles so daily totals (water, steps, blood pressure, medications, injections) roll over at your local midnight instead of midnight UTC" },
      { type: "fixed", description: "Daily totals appearing to reset in the afternoon for users in non-UTC timezones (the container defaulted to UTC)" },
      { type: "fixed", description: "Possible data loss when several updates hit the same record at once (e.g. the app and a Home Assistant automation writing together) - writes to each file are now serialized and saved atomically" },
    ],
  },
  {
    version: "v0.0.20",
    date: "2026-07-03",
    changes: [
      { type: "changed", description: "Unit measure stored in the db now handle floating point, this will cause strange behaviour on old oz data but in the future oz value it will handle decimal point" },
      { type: "added", description: "Possibility to use decimal point in preset and in custom water input" },
      { type: "fixed", description: "Water progression not showing oz correctly" },
    ],
  },
  {
    version: "v0.0.19",
    date: "2026-06-11",
    changes: [
      { type: "fixed", description: "Unit measure in photo comparison" },
    ],
  },
  {
    version: "v0.0.18",
    date: "2026-05-23",
    changes: [
      { type: "fixed", description: "Added body measurement tracking" },
    ],
  },
   {
    version: "v0.0.17",
    date: "2026-02-06",
    changes: [
      { type: "fixed", description: "Fixed multivalue graph tooltip" },
    ],
  },
  {
    version: "v0.0.16",
    date: "2026-02-06",
    changes: [
      { type: "added", description: "Added the body fat option to the weight" },
      { type: "added", description: "Added the possibility to toggle the notes for each types" },
    ],
  },
  {
    version: "v0.0.15",
    date: "2026-02-06",
    changes: [
      { type: "added", description: "Added the possibility to add multi picture" },
      { type: "added", description: "Added the possibility to compare picture" },
    ],
  },
  {
    version: "v0.0.14",
    date: "2026-02-06",
    changes: [
      { type: "added", description: "Added the possibility to add a picture to each record" },
    ],
  },
  {
    version: "v0.0.13",
    date: "2026-02-03",
    changes: [
      { type: "fixed", description: "Today Recap now only shows medications due today based on schedule" },
    ],
  },
  {
    version: "v0.0.12",
    date: "2026-02-03",
    changes: [
      { type: "added", description: "Added medication scheduling (daily, weekly, or interval-based)" },
      { type: "added", description: "Added dosage tracking mode for medications with unit and expected dose" },
      { type: "added", description: "Added medication reminder banner for due medications" },
      { type: "added", description: "Added dose warning when entered dose differs from expected" },
      { type: "added", description: "Added dose highlighting in history table when different from expected" },
      { type: "changed", description: "Improved medication dialog with compact view and quick dose selection buttons" },
      { type: "fixed", description: "Today Recap now only shows medications due today based on schedule" },
    ],
  },
  {
    version: "v0.0.11",
    date: "2026-02-02",
    changes: [
      { type: "added", description: "Added the possibility to choose what injection will be shown in the graph" },
      { type: "added", description: "Added injection color in the injection table" },
    ],
  },
  {
    version: "v0.0.10",
    date: "2026-02-01",
    changes: [
      { type: "fixed", description: "Bug with the save settings" },
    ],
  },
  {
    version: "v0.0.9",
    date: "2026-02-01",
    changes: [
      { type: "changed", description: "Increase the injection from 5 to 15" },
    ],
  },
  {
    version: "v0.0.8",
    date: "2026-01-31",
    changes: [
      { type: "added", description: "Added the possibility to enable/disable the water tracking" },
      { type: "added", description: "Added the possibility to choose what graph to show" },
      { type: "added", description: "Added the possibility to choose a multy value graph" },
    ],
  },
  {
    version: "v0.0.7",
    date: "2026-01-30",
    changes: [
      { type: "added", description: "Added Injection tracker" },
    ],
  },
  {
    version: "v0.0.6",
    date: "2026-01-21",
    changes: [
      { type: "added", description: "Added Steps tracker" },
      { type: "added", description: "Added Blood Pressure tracker" },
      { type: "added", description: "Added Medifications tracker" },
      { type: "added", description: "Added new graph for each" },
      { type: "added", description: "Added an hide button for the today recap" },
      { type: "added", description: "Added an hide for the quotes" },
      { type: "added", description: "Added a close icon on the toastß" },
      { type: "changed", description: "Changed the filter for the graph" },
    ],
  },
  {
    version: "v0.0.5",
    date: "2026-01-12",
    changes: [
      { type: "added", description: "Motivational daily quotes" },
      { type: "added", description: "Added PWA Image" },
      { type: "added", description: "Added some more icons" },
      { type: "added", description: "Added the possibility to change water preset" },
      { type: "added", description: "Added the possibility to track daily water consumption" },
      { type: "added", description: "Added the possibility to track weekly and monthly weight loss/gain" },
    ],
  },
  {
    version: "v0.0.4",
    date: "2026-01-11",
    changes: [
      { type: "added", description: "Home Assistant integration with API key authentication" },
      { type: "added", description: "REST API support for external tools and automations" },
    ],
  },
  {
    version: "v0.0.3",
    date: "2026-01-10",
    changes: [
      { type: "added", description: "Bcrypt for secure login" },
    ],
  },
  {
    version: "v0.0.2",
    date: "2026-01-10",
    changes: [
      { type: "fixed", description: "Fixed login for HTTP connection" },
    ],
  },
  {
    version: "v0.0.1",
    date: "2026-01-10",
    changes: [
      { type: "added", description: "First Release :)" },
    ],
  },
];

const typeColors: Record<string, string> = {
  added: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  changed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  fixed: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  removed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t('changelog.title')}</DialogTitle>
          <DialogDescription>
            {t('changelog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2">
          <div className="space-y-6">
            {changelog.map((entry, index) => (
              <div key={`${entry.version}-${index}`} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">
                    {entry.version}
                  </h3>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {t('changelog.latest')}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {entry.date}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {entry.changes.map((change, changeIndex) => (
                    <li key={changeIndex} className="flex items-start gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 mt-0.5 ${typeColors[change.type]}`}
                      >
                        {change.type}
                      </Badge>
                      <span className="text-muted-foreground">{change.description}</span>
                    </li>
                  ))}
                </ul>
                {index < changelog.length - 1 && (
                  <div className="border-b pt-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <DialogClose asChild>
            <Button type="button">{t('common.ok')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
