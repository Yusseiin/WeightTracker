'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, X, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { DynamicIcon } from './dynamic-icon';
import { IconPicker } from './icon-picker';
import type { ChartCombination, ChartView, ChartType, FeatureToggles } from '@/lib/types';
import { CHART_TYPE_MAP, DEFAULT_CHART_COMBINATIONS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';

interface ChartCombinationManagerProps {
  combinations: ChartCombination[];
  onSave: (combinations: ChartCombination[]) => Promise<void>;
  features: FeatureToggles;
}

// Chart view display names
const CHART_VIEW_NAMES: Record<ChartView, string> = {
  weight: 'Weight',
  water: 'Water',
  steps: 'Steps',
  pressure: 'Blood Pressure',
  medication: 'Medication',
  injections: 'Injections',
};

// Get available charts based on feature toggles
function getAvailableCharts(features: FeatureToggles): ChartView[] {
  const charts: ChartView[] = ['weight']; // Weight is always available
  if (features.waterEnabled) charts.push('water');
  if (features.stepsEnabled) charts.push('steps');
  if (features.pressureEnabled) charts.push('pressure');
  if (features.medicationEnabled) charts.push('medication');
  if (features.injectionsEnabled) charts.push('injections');
  return charts;
}

// Get compatible charts (same chart type)
function getCompatibleCharts(chartType: ChartType, features: FeatureToggles): ChartView[] {
  return getAvailableCharts(features).filter(c => CHART_TYPE_MAP[c] === chartType);
}

export function ChartCombinationManager({ combinations = [], onSave, features }: ChartCombinationManagerProps) {
  const [open, setOpen] = useState(false);
  const [localCombinations, setLocalCombinations] = useState<ChartCombination[]>(combinations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCombination, setEditingCombination] = useState<ChartCombination | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newChartType, setNewChartType] = useState<ChartType>('line');
  const [newCombination, setNewCombination] = useState<Omit<ChartCombination, 'id' | 'order'>>({
    name: '',
    icon: 'LineChart',
    charts: [],
    chartType: 'line',
    enabled: true,
  });
  const [deletingCombination, setDeletingCombination] = useState<ChartCombination | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalCombinations(combinations);
      setEditingId(null);
      setEditingCombination(null);
      setIsAdding(false);
      setNewCombination({ name: '', icon: 'LineChart', charts: [], chartType: 'line', enabled: true });
    }
  }, [open, combinations]);

  const hasChanges = JSON.stringify(localCombinations) !== JSON.stringify(combinations);

  // Move combination up in the list
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCombinations = [...localCombinations];
    [newCombinations[index - 1], newCombinations[index]] = [newCombinations[index], newCombinations[index - 1]];
    // Update order values
    newCombinations.forEach((c, i) => c.order = i);
    setLocalCombinations(newCombinations);
  };

  // Move combination down in the list
  const moveDown = (index: number) => {
    if (index === localCombinations.length - 1) return;
    const newCombinations = [...localCombinations];
    [newCombinations[index], newCombinations[index + 1]] = [newCombinations[index + 1], newCombinations[index]];
    // Update order values
    newCombinations.forEach((c, i) => c.order = i);
    setLocalCombinations(newCombinations);
  };

  // Toggle enabled state
  const toggleEnabled = (id: string) => {
    setLocalCombinations(prev =>
      prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
  };

  // Start editing a combination
  const startEdit = (combination: ChartCombination) => {
    setEditingId(combination.id);
    setEditingCombination({ ...combination });
    setIsAdding(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingCombination(null);
  };

  // Save edit
  const saveEdit = () => {
    if (!editingCombination || !editingCombination.name.trim() || editingCombination.charts.length === 0) return;
    setLocalCombinations(prev =>
      prev.map(c => c.id === editingId ? editingCombination : c)
    );
    setEditingId(null);
    setEditingCombination(null);
  };

  // Toggle a chart in the editing combination
  const toggleChartInEdit = (chart: ChartView) => {
    if (!editingCombination) return;
    const charts = editingCombination.charts.includes(chart)
      ? editingCombination.charts.filter(c => c !== chart)
      : [...editingCombination.charts, chart];
    setEditingCombination({ ...editingCombination, charts });
  };

  // Toggle a chart in the new combination
  const toggleChartInNew = (chart: ChartView) => {
    const charts = newCombination.charts.includes(chart)
      ? newCombination.charts.filter(c => c !== chart)
      : [...newCombination.charts, chart];
    setNewCombination({ ...newCombination, charts });
  };

  // Add new combination
  const addCombination = () => {
    if (!newCombination.name.trim() || newCombination.charts.length === 0) return;
    const combination: ChartCombination = {
      ...newCombination,
      id: `chart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order: localCombinations.length,
    };
    setLocalCombinations(prev => [...prev, combination]);
    setIsAdding(false);
    setNewCombination({ name: '', icon: 'LineChart', charts: [], chartType: 'line', enabled: true });
  };

  // Delete combination
  const deleteCombination = () => {
    if (!deletingCombination) return;
    setLocalCombinations(prev => {
      const filtered = prev.filter(c => c.id !== deletingCombination.id);
      // Update order values
      filtered.forEach((c, i) => c.order = i);
      return filtered;
    });
    setDeletingCombination(null);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setLocalCombinations(DEFAULT_CHART_COMBINATIONS);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localCombinations);
      showSuccessToast('Chart configuration saved');
      setOpen(false);
    } catch {
      showErrorToast('Failed to save chart configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const combinationListContent = (
    <div className="space-y-4">
      {/* Combination list */}
      <div className="space-y-2">
        {localCombinations.map((combination, index) => (
          <div
            key={combination.id}
            className={cn(
              'flex items-center gap-2 p-3 border rounded-lg',
              editingId === combination.id && 'ring-2 ring-primary',
              !combination.enabled && 'opacity-50'
            )}
          >
            {editingId === combination.id && editingCombination ? (
              // Editing mode
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center gap-2">
                  <IconPicker
                    value={editingCombination.icon}
                    onChange={(icon) => setEditingCombination({ ...editingCombination, icon })}
                  />
                  <Input
                    value={editingCombination.name}
                    onChange={(e) => setEditingCombination({ ...editingCombination, name: e.target.value })}
                    className="flex-1"
                    placeholder="Chart name"
                  />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={saveEdit} disabled={!editingCombination.name.trim() || editingCombination.charts.length === 0}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={cancelEdit}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Charts to combine ({editingCombination.chartType} charts only):
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {getCompatibleCharts(editingCombination.chartType, features).map(chart => (
                      <div key={chart} className="flex items-center gap-1">
                        <Checkbox
                          id={`edit-${chart}`}
                          checked={editingCombination.charts.includes(chart)}
                          onCheckedChange={() => toggleChartInEdit(chart)}
                        />
                        <Label htmlFor={`edit-${chart}`} className="text-sm cursor-pointer">
                          {CHART_VIEW_NAMES[chart]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Display mode
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => toggleEnabled(combination.id)}
                >
                  {combination.enabled ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <DynamicIcon name={combination.icon} className="h-5 w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{combination.name}</span>
                  {combination.charts.length > 1 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({combination.charts.map(c => CHART_VIEW_NAMES[c]).join(' + ')})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
                    disabled={index === localCombinations.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(combination)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeletingCombination(combination)}
                    disabled={localCombinations.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new combination form */}
      {isAdding ? (
        <div className="p-3 border rounded-lg border-dashed space-y-3">
          <div className="flex items-center gap-2">
            <Select value={newChartType} onValueChange={(v) => {
              setNewChartType(v as ChartType);
              setNewCombination({ ...newCombination, chartType: v as ChartType, charts: [], icon: v === 'line' ? 'LineChart' : 'BarChart3' });
            }}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
            <IconPicker
              value={newCombination.icon}
              onChange={(icon) => setNewCombination({ ...newCombination, icon })}
            />
            <Input
              value={newCombination.name}
              onChange={(e) => setNewCombination({ ...newCombination, name: e.target.value })}
              className="flex-1"
              placeholder="Chart name"
              autoFocus
            />
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={addCombination} disabled={!newCombination.name.trim() || newCombination.charts.length === 0}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Select charts to combine ({newChartType} charts):
            </Label>
            <div className="flex flex-wrap gap-2">
              {getCompatibleCharts(newChartType, features).map(chart => (
                <div key={chart} className="flex items-center gap-1">
                  <Checkbox
                    id={`new-${chart}`}
                    checked={newCombination.charts.includes(chart)}
                    onCheckedChange={() => toggleChartInNew(chart)}
                  />
                  <Label htmlFor={`new-${chart}`} className="text-sm cursor-pointer">
                    {CHART_VIEW_NAMES[chart]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Chart Combination
        </Button>
      )}

      {/* Reset to defaults */}
      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={resetToDefaults}
      >
        Reset to Defaults
      </Button>
    </div>
  );

  // Count enabled combinations
  const enabledCount = combinations.filter(c => c.enabled).length;

  const TriggerButton = (
    <Button variant="outline" className="w-full justify-start">
      <div className="flex items-center gap-2">
        {combinations.filter(c => c.enabled).slice(0, 3).map(c => (
          <DynamicIcon key={c.id} name={c.icon} className="h-4 w-4" />
        ))}
        {enabledCount > 3 && (
          <span className="text-muted-foreground">+{enabledCount - 3}</span>
        )}
      </div>
      <span className="ml-auto text-muted-foreground">Configure</span>
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Chart Configuration</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
              {combinationListContent}
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
        <AlertDialog open={!!deletingCombination} onOpenChange={(open) => !open && setDeletingCombination(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Chart</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingCombination?.name}&quot;?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteCombination}>Delete</AlertDialogAction>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chart Configuration</DialogTitle>
          </DialogHeader>
          {combinationListContent}
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
      <AlertDialog open={!!deletingCombination} onOpenChange={(open) => !open && setDeletingCombination(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCombination?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCombination}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
