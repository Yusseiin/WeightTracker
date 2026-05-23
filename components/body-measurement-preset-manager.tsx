"use client";

import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { BodyMeasurementPreset, MAX_BODY_MEASUREMENT_PRESETS } from '@/lib/types';

const COLOR_OPTIONS: { value: string; label: string; dot: string }[] = [
  { value: 'text-slate-500',    label: 'Slate',    dot: 'bg-slate-500' },
  { value: 'text-blue-500',     label: 'Blue',     dot: 'bg-blue-500' },
  { value: 'text-purple-500',   label: 'Purple',   dot: 'bg-purple-500' },
  { value: 'text-pink-500',     label: 'Pink',     dot: 'bg-pink-500' },
  { value: 'text-red-500',      label: 'Red',      dot: 'bg-red-500' },
  { value: 'text-orange-500',   label: 'Orange',   dot: 'bg-orange-500' },
  { value: 'text-yellow-500',   label: 'Yellow',   dot: 'bg-yellow-500' },
  { value: 'text-green-500',    label: 'Green',    dot: 'bg-green-500' },
  { value: 'text-emerald-500',  label: 'Emerald',  dot: 'bg-emerald-500' },
  { value: 'text-teal-500',     label: 'Teal',     dot: 'bg-teal-500' },
  { value: 'text-cyan-500',     label: 'Cyan',     dot: 'bg-cyan-500' },
  { value: 'text-indigo-500',   label: 'Indigo',   dot: 'bg-indigo-500' },
];

function randomId(): string {
  return `bm_${Math.random().toString(36).substring(2, 9)}`;
}

interface BodyMeasurementPresetManagerProps {
  presets: BodyMeasurementPreset[];
  onSave: (presets: BodyMeasurementPreset[]) => Promise<void>;
}

export function BodyMeasurementPresetManager({
  presets,
  onSave,
}: BodyMeasurementPresetManagerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<BodyMeasurementPreset[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset local state when the dialog opens, mirroring ActivityManager
  useEffect(() => {
    if (open) {
      setLocal([...presets].sort((a, b) => a.order - b.order));
    }
  }, [open, presets]);

  const sortedPresets = [...presets].sort((a, b) => a.order - b.order);
  const dirty = JSON.stringify(local) !== JSON.stringify(sortedPresets);

  const updateField = (id: string, patch: Partial<BodyMeasurementPreset>) => {
    setLocal((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePreset = (id: string) => {
    setLocal((prev) =>
      prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i }))
    );
  };

  const move = (id: string, delta: -1 | 1) => {
    setLocal((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy.map((p, i) => ({ ...p, order: i }));
    });
  };

  const addPreset = () => {
    if (local.length >= MAX_BODY_MEASUREMENT_PRESETS) return;
    setLocal((prev) => [
      ...prev,
      {
        id: randomId(),
        label: 'New measurement',
        color: COLOR_OPTIONS[prev.length % COLOR_OPTIONS.length].value,
        order: prev.length,
      },
    ]);
  };

  const handleSave = async () => {
    for (const p of local) {
      if (!p.label.trim()) {
        showErrorToast('Every measurement needs a label');
        return;
      }
    }
    const ids = local.map((p) => p.id);
    if (new Set(ids).size !== ids.length) {
      showErrorToast('Measurement IDs must be unique');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(local);
      showSuccessToast('Measurements saved');
      setOpen(false);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ----- The full editing UI shown inside the Dialog/Drawer -----
  const listContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          Measurements ({local.length}/{MAX_BODY_MEASUREMENT_PRESETS})
        </Label>
        <Button
          size="sm"
          variant="outline"
          onClick={addPreset}
          disabled={local.length >= MAX_BODY_MEASUREMENT_PRESETS}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {local.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No measurements yet.</p>
      ) : (
        <div className="space-y-2">
          {local.map((preset, idx) => (
            <div
              key={preset.id}
              className="flex items-center gap-1.5 rounded-md border bg-muted/30 p-2"
            >
              <div className="flex flex-col gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => move(preset.id, -1)}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => move(preset.id, 1)}
                  disabled={idx === local.length - 1}
                  title="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              <Input
                value={preset.label}
                onChange={(e) => updateField(preset.id, { label: e.target.value })}
                placeholder="Label"
                className="flex-1 h-8"
              />

              <Select
                value={preset.color}
                onValueChange={(v) => updateField(preset.id, { color: v })}
              >
                <SelectTrigger
                  size="sm"
                  className="w-14 px-2 gap-1 shrink-0"
                  title={
                    COLOR_OPTIONS.find((o) => o.value === preset.color)?.label ?? 'Color'
                  }
                  aria-label="Color"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full border border-border ${
                      COLOR_OPTIONS.find((o) => o.value === preset.color)?.dot ?? ''
                    }`}
                  />
                </SelectTrigger>
                <SelectContent position="popper" align="end" sideOffset={4}>
                  {COLOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${opt.dot}`} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removePreset(preset.id)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ----- Compact trigger button (shown collapsed in settings) -----
  const TriggerButton = (
    <Button variant="outline" className="w-full justify-start">
      <div className="flex items-center gap-1.5">
        {sortedPresets.slice(0, 4).map((p) => {
          const dot = COLOR_OPTIONS.find((c) => c.value === p.color)?.dot ?? 'bg-muted';
          return (
            <span
              key={p.id}
              className={`h-3 w-3 rounded-full ${dot} border border-border`}
              title={p.label}
            />
          );
        })}
        {sortedPresets.length > 4 && (
          <span className="text-xs text-muted-foreground">
            +{sortedPresets.length - 4}
          </span>
        )}
        {sortedPresets.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            No measurements yet
          </span>
        )}
      </div>
      <span className="ml-auto text-muted-foreground">Manage</span>
    </Button>
  );

  const footerButtons = (
    <>
      <Button onClick={handleSave} disabled={isSaving || !dirty}>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Changes
      </Button>
      {isMobile ? (
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      ) : (
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>Manage Body Measurements</DrawerTitle>
            <DrawerDescription>
              Add, rename, reorder, and recolor the body parts you track.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto flex-1">{listContent}</div>
          <DrawerFooter className="pt-2 border-t shrink-0">
            {footerButtons}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Body Measurements</DialogTitle>
          <DialogDescription>
            Add, rename, reorder, and recolor the body parts you track.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto -mx-6 px-6 flex-1">{listContent}</div>
        <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
          {footerButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
