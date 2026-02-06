"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Changelog</DialogTitle>
          <DialogDescription>
            See what&apos;s new and improved in Weight Tracker App
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
                      Latest
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
      </DialogContent>
    </Dialog>
  );
}
