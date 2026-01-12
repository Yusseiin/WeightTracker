'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { DynamicIcon } from './dynamic-icon';
import { WaterPreset, MAX_WATER_PRESETS, WaterUnit } from '@/lib/types';
import { WATER_ICONS } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { formatWaterAmount, ozToMl, mlToOz } from '@/lib/water-utils';

interface WaterPresetManagerProps {
  presets: WaterPreset[];
  onSave: (presets: WaterPreset[]) => Promise<void>;
  waterUnit: WaterUnit;
}

export function WaterPresetManager({ presets = [], onSave, waterUnit }: WaterPresetManagerProps) {
  const [open, setOpen] = useState(false);
  const [localPresets, setLocalPresets] = useState<WaterPreset[]>(presets || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<WaterPreset | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPreset, setNewPreset] = useState<Omit<WaterPreset, 'id'>>({
    label: '',
    icon: 'Droplets',
    amount: 250,
  });
  const [newPresetAmount, setNewPresetAmount] = useState<string>('250');
  const [deletingPreset, setDeletingPreset] = useState<WaterPreset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalPresets(presets || []);
      setEditingId(null);
      setEditingPreset(null);
      setEditingAmount('');
      setIsAdding(false);
      setNewPreset({ label: '', icon: 'Droplets', amount: 250 });
      setNewPresetAmount(waterUnit === 'oz' ? '8' : '250');
    }
  }, [open, presets, waterUnit]);

  const hasChanges = JSON.stringify(localPresets) !== JSON.stringify(presets || []);

  // Move preset up in the list
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPresets = [...localPresets];
    [newPresets[index - 1], newPresets[index]] = [newPresets[index], newPresets[index - 1]];
    setLocalPresets(newPresets);
  };

  // Move preset down in the list
  const moveDown = (index: number) => {
    if (index === localPresets.length - 1) return;
    const newPresets = [...localPresets];
    [newPresets[index], newPresets[index + 1]] = [newPresets[index + 1], newPresets[index]];
    setLocalPresets(newPresets);
  };

  // Start editing a preset
  const startEdit = (preset: WaterPreset) => {
    setEditingId(preset.id);
    setEditingPreset({ ...preset });
    // Convert amount to display unit
    const displayAmount = waterUnit === 'oz' ? Math.round(mlToOz(preset.amount)) : preset.amount;
    setEditingAmount(displayAmount.toString());
    setIsAdding(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingPreset(null);
    setEditingAmount('');
  };

  // Save edit
  const saveEdit = () => {
    if (!editingPreset || !editingPreset.label.trim()) return;
    const amountValue = parseInt(editingAmount) || 0;
    if (amountValue <= 0) return;

    // Convert to ml if user entered oz
    const amountInMl = waterUnit === 'oz' ? ozToMl(amountValue) : amountValue;

    setLocalPresets((prev) =>
      prev.map((p) => (p.id === editingId ? { ...editingPreset, amount: amountInMl } : p))
    );
    setEditingId(null);
    setEditingPreset(null);
    setEditingAmount('');
  };

  // Add new preset
  const addPreset = () => {
    if (!newPreset.label.trim() || localPresets.length >= MAX_WATER_PRESETS) return;
    const amountValue = parseInt(newPresetAmount) || 0;
    if (amountValue <= 0) return;

    // Convert to ml if user entered oz
    const amountInMl = waterUnit === 'oz' ? ozToMl(amountValue) : amountValue;

    const preset: WaterPreset = {
      ...newPreset,
      amount: amountInMl,
      id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setLocalPresets((prev) => [...prev, preset]);
    setIsAdding(false);
    setNewPreset({ label: '', icon: 'Droplets', amount: 250 });
    setNewPresetAmount(waterUnit === 'oz' ? '8' : '250');
  };

  // Delete preset (after confirmation)
  const deletePreset = () => {
    if (!deletingPreset) return;
    setLocalPresets((prev) => prev.filter((p) => p.id !== deletingPreset.id));
    setDeletingPreset(null);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localPresets);
      showSuccessToast('Water presets saved');
      setOpen(false);
    } catch {
      showErrorToast('Failed to save water presets');
    } finally {
      setIsSaving(false);
    }
  };

  const unitLabel = waterUnit === 'oz' ? 'oz' : 'ml';

  const presetListContent = (
    <div className="space-y-4">
      {/* Preset list */}
      <div className="space-y-2">
        {localPresets.map((preset, index) => (
          <div
            key={preset.id}
            className={cn(
              'flex items-center gap-2 p-3 border rounded-lg',
              editingId === preset.id && 'ring-2 ring-primary'
            )}
          >
            {editingId === preset.id && editingPreset ? (
              // Editing mode
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2">
                  {/* Icon picker - simple row of water icons */}
                  <div className="flex gap-1">
                    {WATER_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={cn(
                          'p-1.5 rounded border',
                          editingPreset.icon === icon
                            ? 'border-primary bg-primary/10'
                            : 'border-transparent hover:bg-muted'
                        )}
                        onClick={() => setEditingPreset({ ...editingPreset, icon })}
                      >
                        <DynamicIcon name={icon} className="h-4 w-4 text-blue-500" />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 ml-auto">
                    <Button variant="ghost" size="icon" onClick={saveEdit}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={cancelEdit}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={editingPreset.label}
                    onChange={(e) => setEditingPreset({ ...editingPreset, label: e.target.value })}
                    className="flex-1"
                    placeholder="Label"
                  />
                  <div className="relative w-30">
                    <Input
                      type="number"
                      value={editingAmount}
                      onChange={(e) => setEditingAmount(e.target.value)}
                      className="pr-8"
                      placeholder="Amount"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {unitLabel}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Display mode
              <>
                <DynamicIcon name={preset.icon} className="h-5 w-5 text-blue-500" />
                <span className="flex-1 font-medium">{preset.label}</span>
                <span className="text-sm text-muted-foreground">
                  {formatWaterAmount(preset.amount, waterUnit)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveDown(index)}
                    disabled={index === localPresets.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(preset)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeletingPreset(preset)}
                    disabled={localPresets.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new preset form */}
      {isAdding ? (
        <div className="p-3 border rounded-lg border-dashed">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              {/* Icon picker */}
              <div className="flex gap-1">
                {WATER_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      'p-1.5 rounded border',
                      newPreset.icon === icon
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:bg-muted'
                    )}
                    onClick={() => setNewPreset({ ...newPreset, icon })}
                  >
                    <DynamicIcon name={icon} className="h-4 w-4 text-blue-500" />
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={addPreset}
                  disabled={!newPreset.label.trim() || parseInt(newPresetAmount) <= 0}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={newPreset.label}
                onChange={(e) => setNewPreset({ ...newPreset, label: e.target.value })}
                className="flex-1"
                placeholder="Label (e.g., Cup, Bottle)"
                autoFocus
              />
              <div className="relative w-30">
                <Input
                  type="number"
                  value={newPresetAmount}
                  onChange={(e) => setNewPresetAmount(e.target.value)}
                  className="pr-8"
                  placeholder="Amount"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {unitLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAdding(true)}
          disabled={localPresets.length >= MAX_WATER_PRESETS}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Preset
          {localPresets.length >= MAX_WATER_PRESETS && (
            <span className="ml-2 text-muted-foreground">(max {MAX_WATER_PRESETS})</span>
          )}
        </Button>
      )}

      {/* Info text */}
      <p className="text-xs text-muted-foreground text-center">
        {localPresets.length} / {MAX_WATER_PRESETS} presets
      </p>
    </div>
  );

  const safePresets = presets || [];
  const TriggerButton = (
    <Button variant="outline" className="w-full justify-start">
      <div className="flex items-center gap-2">
        {safePresets.slice(0, 3).map((p) => (
          <DynamicIcon key={p.id} name={p.icon} className="h-4 w-4 text-blue-500" />
        ))}
        {safePresets.length > 3 && (
          <span className="text-muted-foreground">+{safePresets.length - 3}</span>
        )}
      </div>
      <span className="ml-auto text-muted-foreground">Manage</span>
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Manage Water Presets</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
              {presetListContent}
            </div>
            <DrawerFooter>
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Delete confirmation */}
        <AlertDialog open={!!deletingPreset} onOpenChange={(open) => !open && setDeletingPreset(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Preset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingPreset?.label}&quot;?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deletePreset}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Water Presets</DialogTitle>
          </DialogHeader>
          {presetListContent}
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingPreset} onOpenChange={(open) => !open && setDeletingPreset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingPreset?.label}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePreset}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
