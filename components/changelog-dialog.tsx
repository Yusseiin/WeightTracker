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
    version: process.env.NEXT_PUBLIC_VERSION || "",
    date: "2025-01-10",
    changes: [
      { type: "fixed", description: "Fixed login for HTTP connection" },
    ],
  },
  {
    version: "v0.0.1",
    date: "2025-01-10",
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
                    v{entry.version}
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
