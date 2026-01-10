'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { CustomActivity, MAX_ACTIVITIES, WeightEntry } from '@/lib/types';
import { ACTIVITY_COLORS } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';

interface ActivityManagerProps {
  activities: CustomActivity[];
  onSave: (activities: CustomActivity[]) => Promise<void>;
  entries: WeightEntry[];
}

export function ActivityManager({ activities = [], onSave, entries }: ActivityManagerProps) {
  const [open, setOpen] = useState(false);
  const [localActivities, setLocalActivities] = useState<CustomActivity[]>(activities || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<CustomActivity | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newActivity, setNewActivity] = useState<Omit<CustomActivity, 'id'>>({
    label: '',
    icon: 'Star',
    color: 'text-muted-foreground',
  });
  const [deletingActivity, setDeletingActivity] = useState<CustomActivity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalActivities(activities || []);
      setEditingId(null);
      setEditingActivity(null);
      setIsAdding(false);
      setNewActivity({ label: '', icon: 'Star', color: 'text-muted-foreground' });
    }
  }, [open, activities]);

  const hasChanges = JSON.stringify(localActivities) !== JSON.stringify(activities || []);

  // Count entries using a specific activity
  const getActivityUsageCount = (activityId: string): number => {
    return entries.filter((e) => e.training === activityId).length;
  };

  // Move activity up in the list
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newActivities = [...localActivities];
    [newActivities[index - 1], newActivities[index]] = [newActivities[index], newActivities[index - 1]];
    setLocalActivities(newActivities);
  };

  // Move activity down in the list
  const moveDown = (index: number) => {
    if (index === localActivities.length - 1) return;
    const newActivities = [...localActivities];
    [newActivities[index], newActivities[index + 1]] = [newActivities[index + 1], newActivities[index]];
    setLocalActivities(newActivities);
  };

  // Start editing an activity
  const startEdit = (activity: CustomActivity) => {
    setEditingId(activity.id);
    setEditingActivity({ ...activity });
    setIsAdding(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingActivity(null);
  };

  // Save edit
  const saveEdit = () => {
    if (!editingActivity || !editingActivity.label.trim()) return;
    setLocalActivities((prev) =>
      prev.map((a) => (a.id === editingId ? editingActivity : a))
    );
    setEditingId(null);
    setEditingActivity(null);
  };

  // Add new activity
  const addActivity = () => {
    if (!newActivity.label.trim() || localActivities.length >= MAX_ACTIVITIES) return;
    const activity: CustomActivity = {
      ...newActivity,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setLocalActivities((prev) => [...prev, activity]);
    setIsAdding(false);
    setNewActivity({ label: '', icon: 'Star', color: 'text-muted-foreground' });
  };

  // Delete activity (after confirmation)
  const deleteActivity = () => {
    if (!deletingActivity) return;
    setLocalActivities((prev) => prev.filter((a) => a.id !== deletingActivity.id));
    setDeletingActivity(null);
  };

  // Handle delete click - check for usage first
  const handleDeleteClick = (activity: CustomActivity) => {
    const usageCount = getActivityUsageCount(activity.id);
    if (usageCount > 0) {
      showErrorToast(`Cannot delete: ${usageCount} entries use this activity`);
      return;
    }
    setDeletingActivity(activity);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localActivities);
      showSuccessToast('Activities saved');
      setOpen(false);
    } catch {
      showErrorToast('Failed to save activities');
    } finally {
      setIsSaving(false);
    }
  };

  const ActivityList = () => (
    <div className="space-y-4">
      {/* Activity list */}
      <div className="space-y-2">
        {localActivities.map((activity, index) => (
          <div
            key={activity.id}
            className={cn(
              'flex items-center gap-2 p-3 border rounded-lg',
              editingId === activity.id && 'ring-2 ring-primary'
            )}
          >
            {editingId === activity.id && editingActivity ? (
              // Editing mode
              <>
                <IconPicker
                  value={editingActivity.icon}
                  onChange={(icon) => setEditingActivity({ ...editingActivity, icon })}
                  colorClass={editingActivity.color}
                />
                <Input
                  value={editingActivity.label}
                  onChange={(e) => setEditingActivity({ ...editingActivity, label: e.target.value })}
                  className="flex-1"
                  placeholder="Activity name"
                />
                <div className="flex gap-1">
                  {ACTIVITY_COLORS.slice(0, 5).map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn(
                        'w-6 h-6 rounded-full border-2',
                        editingActivity.color === color.value
                          ? 'border-foreground'
                          : 'border-transparent'
                      )}
                      style={{ backgroundColor: color.preview }}
                      onClick={() => setEditingActivity({ ...editingActivity, color: color.value })}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="icon" onClick={saveEdit}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={cancelEdit}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            ) : (
              // Display mode
              <>
                <DynamicIcon name={activity.icon} className={cn('h-5 w-5', activity.color)} />
                <span className="flex-1 font-medium">{activity.label}</span>
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
                    disabled={index === localActivities.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(activity)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteClick(activity)}
                    disabled={localActivities.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new activity form */}
      {isAdding ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg border-dashed">
          <IconPicker
            value={newActivity.icon}
            onChange={(icon) => setNewActivity({ ...newActivity, icon })}
            colorClass={newActivity.color}
          />
          <Input
            value={newActivity.label}
            onChange={(e) => setNewActivity({ ...newActivity, label: e.target.value })}
            className="flex-1"
            placeholder="Activity name"
            autoFocus
          />
          <div className="flex gap-1">
            {ACTIVITY_COLORS.slice(0, 5).map((color) => (
              <button
                key={color.value}
                type="button"
                className={cn(
                  'w-6 h-6 rounded-full border-2',
                  newActivity.color === color.value
                    ? 'border-foreground'
                    : 'border-transparent'
                )}
                style={{ backgroundColor: color.preview }}
                onClick={() => setNewActivity({ ...newActivity, color: color.value })}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={addActivity} disabled={!newActivity.label.trim()}>
            <Check className="h-4 w-4 text-green-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAdding(true)}
          disabled={localActivities.length >= MAX_ACTIVITIES}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
          {localActivities.length >= MAX_ACTIVITIES && (
            <span className="ml-2 text-muted-foreground">(max {MAX_ACTIVITIES})</span>
          )}
        </Button>
      )}

      {/* Info text */}
      <p className="text-xs text-muted-foreground text-center">
        {localActivities.length} / {MAX_ACTIVITIES} activities
      </p>
    </div>
  );

  const safeActivities = activities || [];
  const TriggerButton = (
    <Button variant="outline" className="w-full justify-start">
      <div className="flex items-center gap-2">
        {safeActivities.slice(0, 3).map((a) => (
          <DynamicIcon key={a.id} name={a.icon} className={cn('h-4 w-4', a.color)} />
        ))}
        {safeActivities.length > 3 && (
          <span className="text-muted-foreground">+{safeActivities.length - 3}</span>
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
              <DrawerTitle>Manage Activities</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
              <ActivityList />
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
        <AlertDialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Activity</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingActivity?.label}&quot;?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteActivity}>Delete</AlertDialogAction>
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
            <DialogTitle>Manage Activities</DialogTitle>
          </DialogHeader>
          <ActivityList />
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
      <AlertDialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingActivity?.label}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteActivity}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
