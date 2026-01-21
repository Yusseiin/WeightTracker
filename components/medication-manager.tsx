'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, X, Check, Loader2, Pill } from 'lucide-react';
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
import { IconPicker } from './icon-picker';
import { MedicationPreset, MAX_MEDICATIONS, MedicationEntry } from '@/lib/types';
import { ACTIVITY_COLORS } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';

interface MedicationManagerProps {
  medications: MedicationPreset[];
  onSave: (medications: MedicationPreset[]) => Promise<void>;
  medicationEntries?: MedicationEntry[];
}

export function MedicationManager({ medications = [], onSave, medicationEntries = [] }: MedicationManagerProps) {
  const [open, setOpen] = useState(false);
  const [localMedications, setLocalMedications] = useState<MedicationPreset[]>(medications || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMedication, setEditingMedication] = useState<MedicationPreset | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newMedication, setNewMedication] = useState<Omit<MedicationPreset, 'id'>>({
    label: '',
    icon: 'Pill',
    color: 'text-purple-500',
  });
  const [deletingMedication, setDeletingMedication] = useState<MedicationPreset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalMedications(medications || []);
      setEditingId(null);
      setEditingMedication(null);
      setIsAdding(false);
      setNewMedication({ label: '', icon: 'Pill', color: 'text-purple-500' });
    }
  }, [open, medications]);

  const hasChanges = JSON.stringify(localMedications) !== JSON.stringify(medications || []);

  // Count entries using a specific medication
  const getMedicationUsageCount = (medicationId: string): number => {
    return medicationEntries.filter((e) => e.medicationId === medicationId).length;
  };

  // Move medication up in the list
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newMedications = [...localMedications];
    [newMedications[index - 1], newMedications[index]] = [newMedications[index], newMedications[index - 1]];
    setLocalMedications(newMedications);
  };

  // Move medication down in the list
  const moveDown = (index: number) => {
    if (index === localMedications.length - 1) return;
    const newMedications = [...localMedications];
    [newMedications[index], newMedications[index + 1]] = [newMedications[index + 1], newMedications[index]];
    setLocalMedications(newMedications);
  };

  // Start editing a medication
  const startEdit = (medication: MedicationPreset) => {
    setEditingId(medication.id);
    setEditingMedication({ ...medication });
    setIsAdding(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingMedication(null);
  };

  // Save edit
  const saveEdit = () => {
    if (!editingMedication || !editingMedication.label.trim()) return;
    setLocalMedications((prev) =>
      prev.map((m) => (m.id === editingId ? editingMedication : m))
    );
    setEditingId(null);
    setEditingMedication(null);
  };

  // Add new medication
  const addMedication = () => {
    if (!newMedication.label.trim() || localMedications.length >= MAX_MEDICATIONS) return;
    const medication: MedicationPreset = {
      ...newMedication,
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setLocalMedications((prev) => [...prev, medication]);
    setIsAdding(false);
    setNewMedication({ label: '', icon: 'Pill', color: 'text-purple-500' });
  };

  // Delete medication (after confirmation)
  const deleteMedication = () => {
    if (!deletingMedication) return;
    setLocalMedications((prev) => prev.filter((m) => m.id !== deletingMedication.id));
    setDeletingMedication(null);
  };

  // Handle delete click - check for usage first
  const handleDeleteClick = (medication: MedicationPreset) => {
    const usageCount = getMedicationUsageCount(medication.id);
    if (usageCount > 0) {
      showErrorToast(`Cannot delete: ${usageCount} entries use this medication`);
      return;
    }
    setDeletingMedication(medication);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localMedications);
      showSuccessToast('Medications saved');
      setOpen(false);
    } catch {
      showErrorToast('Failed to save medications');
    } finally {
      setIsSaving(false);
    }
  };

  const medicationListContent = (
    <div className="space-y-4">
      {/* Medication list */}
      <div className="space-y-2">
        {localMedications.map((medication, index) => (
          <div
            key={medication.id}
            className={cn(
              'flex items-center gap-2 p-3 border rounded-lg',
              editingId === medication.id && 'ring-2 ring-primary'
            )}
          >
            {editingId === medication.id && editingMedication ? (
              // Editing mode
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2">
                  <IconPicker
                    value={editingMedication.icon}
                    onChange={(icon) => setEditingMedication({ ...editingMedication, icon })}
                    colorClass={editingMedication.color}
                  />
                  <div className="flex gap-1">
                    {ACTIVITY_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={cn(
                          'w-6 h-6 rounded-full border-2',
                          editingMedication.color === color.value
                            ? 'border-foreground'
                            : 'border-transparent'
                        )}
                        style={{ backgroundColor: color.preview }}
                        onClick={() => setEditingMedication({ ...editingMedication, color: color.value })}
                      />
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
                <Input
                  value={editingMedication.label}
                  onChange={(e) => setEditingMedication({ ...editingMedication, label: e.target.value })}
                  className="w-full"
                  placeholder="Medication name"
                />
              </div>
            ) : (
              // Display mode
              <>
                <DynamicIcon name={medication.icon} className={cn('h-5 w-5', medication.color)} />
                <span className="flex-1 font-medium">{medication.label}</span>
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
                    disabled={index === localMedications.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(medication)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteClick(medication)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new medication form */}
      {isAdding ? (
        <div className="p-3 border rounded-lg border-dashed">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <IconPicker
                value={newMedication.icon}
                onChange={(icon) => setNewMedication({ ...newMedication, icon })}
                colorClass={newMedication.color}
              />
              <div className="flex gap-1">
                {ACTIVITY_COLORS.slice(0, 5).map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'w-6 h-6 rounded-full border-2',
                      newMedication.color === color.value
                        ? 'border-foreground'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.preview }}
                    onClick={() => setNewMedication({ ...newMedication, color: color.value })}
                  />
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="icon" onClick={addMedication} disabled={!newMedication.label.trim()}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <Input
              value={newMedication.label}
              onChange={(e) => setNewMedication({ ...newMedication, label: e.target.value })}
              className="w-full"
              placeholder="Medication name"
              autoFocus
            />
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAdding(true)}
          disabled={localMedications.length >= MAX_MEDICATIONS}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
          {localMedications.length >= MAX_MEDICATIONS && (
            <span className="ml-2 text-muted-foreground">(max {MAX_MEDICATIONS})</span>
          )}
        </Button>
      )}

      {/* Info text */}
      <p className="text-xs text-muted-foreground text-center">
        {localMedications.length} / {MAX_MEDICATIONS} medications
      </p>
    </div>
  );

  const safeMedications = medications || [];
  const TriggerButton = (
    <Button variant="outline" className="w-full justify-start">
      <div className="flex items-center gap-2">
        {safeMedications.length > 0 ? (
          <>
            {safeMedications.slice(0, 3).map((m) => (
              <DynamicIcon key={m.id} name={m.icon} className={cn('h-4 w-4', m.color)} />
            ))}
            {safeMedications.length > 3 && (
              <span className="text-muted-foreground">+{safeMedications.length - 3}</span>
            )}
          </>
        ) : (
          <Pill className="h-4 w-4 text-purple-500" />
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
              <DrawerTitle>Manage Medications</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
              {medicationListContent}
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
        <AlertDialog open={!!deletingMedication} onOpenChange={(open) => !open && setDeletingMedication(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Medication</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingMedication?.label}&quot;?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteMedication}>Delete</AlertDialogAction>
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
            <DialogTitle>Manage Medications</DialogTitle>
          </DialogHeader>
          {medicationListContent}
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
      <AlertDialog open={!!deletingMedication} onOpenChange={(open) => !open && setDeletingMedication(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medication</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingMedication?.label}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMedication}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
