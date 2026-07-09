'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, X, Check, Loader2, Syringe } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { InjectableMedication, InjectionSitePreset, InjectionSettings, MAX_INJECTABLE_MEDICATIONS, MAX_INJECTION_SITES, InjectionEntry } from '@/lib/types';
import { ACTIVITY_COLORS } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { useTranslation } from '@/hooks/use-translation';

interface InjectionSettingsManagerProps {
  settings: InjectionSettings;
  onSave: (settings: InjectionSettings) => Promise<void>;
  injectionEntries?: InjectionEntry[];
}

export function InjectionSettingsManager({ settings, onSave, injectionEntries = [] }: InjectionSettingsManagerProps) {
  const [open, setOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<InjectionSettings>(settings);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [editingMedication, setEditingMedication] = useState<InjectableMedication | null>(null);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [newMedication, setNewMedication] = useState<Omit<InjectableMedication, 'id'>>({
    name: '',
    color: 'text-teal-500',
    unit: 'mg',
    availableDoses: [],
  });
  const [newDoseInput, setNewDoseInput] = useState('');
  const [editingDoseInput, setEditingDoseInput] = useState('');
  const [deletingMedication, setDeletingMedication] = useState<InjectableMedication | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Site editing state
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<InjectionSitePreset | null>(null);
  const [isAddingSite, setIsAddingSite] = useState(false);
  const [newSite, setNewSite] = useState<Omit<InjectionSitePreset, 'id'>>({
    label: '',
    icon: 'Syringe',
  });
  const [deletingSite, setDeletingSite] = useState<InjectionSitePreset | null>(null);

  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
      setEditingMedicationId(null);
      setEditingMedication(null);
      setIsAddingMedication(false);
      setNewMedication({ name: '', color: 'text-teal-500', unit: 'mg', availableDoses: [] });
      setNewDoseInput('');
      // Reset site state
      setEditingSiteId(null);
      setEditingSite(null);
      setIsAddingSite(false);
      setNewSite({ label: '', icon: 'Syringe' });
    }
  }, [open, settings]);

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  // Count entries using a specific medication
  const getMedicationUsageCount = (medicationId: string): number => {
    return injectionEntries.filter((e) => e.medicationId === medicationId).length;
  };

  // Add dose to new medication
  const addDoseToNew = () => {
    const dose = parseFloat(newDoseInput);
    if (isNaN(dose) || dose <= 0) return;
    if (newMedication.availableDoses.includes(dose)) return;
    setNewMedication({
      ...newMedication,
      availableDoses: [...newMedication.availableDoses, dose].sort((a, b) => a - b),
    });
    setNewDoseInput('');
  };

  // Remove dose from new medication
  const removeDoseFromNew = (dose: number) => {
    setNewMedication({
      ...newMedication,
      availableDoses: newMedication.availableDoses.filter((d) => d !== dose),
    });
  };

  // Add dose to editing medication
  const addDoseToEditing = () => {
    if (!editingMedication) return;
    const dose = parseFloat(editingDoseInput);
    if (isNaN(dose) || dose <= 0) return;
    if (editingMedication.availableDoses.includes(dose)) return;
    setEditingMedication({
      ...editingMedication,
      availableDoses: [...editingMedication.availableDoses, dose].sort((a, b) => a - b),
    });
    setEditingDoseInput('');
  };

  // Remove dose from editing medication
  const removeDoseFromEditing = (dose: number) => {
    if (!editingMedication) return;
    setEditingMedication({
      ...editingMedication,
      availableDoses: editingMedication.availableDoses.filter((d) => d !== dose),
    });
  };

  // Start editing a medication
  const startEditMedication = (medication: InjectableMedication) => {
    setEditingMedicationId(medication.id);
    setEditingMedication({ ...medication });
    setEditingDoseInput('');
    setIsAddingMedication(false);
  };

  // Cancel editing
  const cancelEditMedication = () => {
    setEditingMedicationId(null);
    setEditingMedication(null);
  };

  // Save edit
  const saveEditMedication = () => {
    if (!editingMedication || !editingMedication.name.trim() || editingMedication.availableDoses.length === 0) return;
    setLocalSettings((prev) => ({
      ...prev,
      medications: prev.medications.map((m) => (m.id === editingMedicationId ? editingMedication : m)),
    }));
    setEditingMedicationId(null);
    setEditingMedication(null);
  };

  // Add new medication
  const addMedication = () => {
    if (!newMedication.name.trim() || newMedication.availableDoses.length === 0 || localSettings.medications.length >= MAX_INJECTABLE_MEDICATIONS) return;
    const medication: InjectableMedication = {
      ...newMedication,
      id: `inj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setLocalSettings((prev) => ({
      ...prev,
      medications: [...prev.medications, medication],
    }));
    setIsAddingMedication(false);
    setNewMedication({ name: '', color: 'text-teal-500', unit: 'mg', availableDoses: [] });
    setNewDoseInput('');
  };

  // Delete medication (after confirmation)
  const deleteMedication = () => {
    if (!deletingMedication) return;
    setLocalSettings((prev) => ({
      ...prev,
      medications: prev.medications.filter((m) => m.id !== deletingMedication.id),
    }));
    setDeletingMedication(null);
  };

  // Handle delete click - check for usage first
  const handleDeleteMedicationClick = (medication: InjectableMedication) => {
    const usageCount = getMedicationUsageCount(medication.id);
    if (usageCount > 0) {
      showErrorToast(t('managers.injection.cannotDeleteMedication', { count: usageCount }));
      return;
    }
    setDeletingMedication(medication);
  };

  // Count entries using a specific site
  const getSiteUsageCount = (siteId: string): number => {
    return injectionEntries.filter((e) => e.siteId === siteId).length;
  };

  // Start editing a site
  const startEditSite = (site: InjectionSitePreset) => {
    setEditingSiteId(site.id);
    setEditingSite({ ...site });
    setIsAddingSite(false);
  };

  // Cancel editing site
  const cancelEditSite = () => {
    setEditingSiteId(null);
    setEditingSite(null);
  };

  // Save site edit
  const saveEditSite = () => {
    if (!editingSite || !editingSite.label.trim()) return;
    setLocalSettings((prev) => ({
      ...prev,
      injectionSites: prev.injectionSites.map((s) => (s.id === editingSiteId ? editingSite : s)),
    }));
    setEditingSiteId(null);
    setEditingSite(null);
  };

  // Add new site
  const addSite = () => {
    if (!newSite.label.trim() || localSettings.injectionSites.length >= MAX_INJECTION_SITES) return;
    const site: InjectionSitePreset = {
      ...newSite,
      id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setLocalSettings((prev) => ({
      ...prev,
      injectionSites: [...prev.injectionSites, site],
    }));
    setIsAddingSite(false);
    setNewSite({ label: '', icon: 'Syringe' });
  };

  // Delete site (after confirmation)
  const deleteSite = () => {
    if (!deletingSite) return;
    setLocalSettings((prev) => ({
      ...prev,
      injectionSites: prev.injectionSites.filter((s) => s.id !== deletingSite.id),
    }));
    setDeletingSite(null);
  };

  // Handle delete site click - check for usage first
  const handleDeleteSiteClick = (site: InjectionSitePreset) => {
    const usageCount = getSiteUsageCount(site.id);
    if (usageCount > 0) {
      showErrorToast(t('managers.injection.cannotDeleteSite', { count: usageCount }));
      return;
    }
    setDeletingSite(site);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSettings);
      showSuccessToast(t('managers.injection.saved'));
      setOpen(false);
    } catch {
      showErrorToast(t('managers.injection.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const medicationsContent = (
    <div className="space-y-4">
      {/* Medication list */}
      <div className="space-y-2">
        {localSettings.medications.map((medication) => (
          <div
            key={medication.id}
            className={cn(
              'p-3 border rounded-lg',
              editingMedicationId === medication.id && 'ring-2 ring-primary'
            )}
          >
            {editingMedicationId === medication.id && editingMedication ? (
              // Editing mode
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={editingMedication.name}
                    onChange={(e) => setEditingMedication({ ...editingMedication, name: e.target.value })}
                    placeholder={t('managers.injection.medicationNamePlaceholder')}
                    className="flex-1"
                  />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={saveEditMedication} disabled={!editingMedication.name.trim() || editingMedication.availableDoses.length === 0}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={cancelEditMedication}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">{t('managers.injection.unitLabel')}</Label>
                  <Input
                    value={editingMedication.unit}
                    onChange={(e) => setEditingMedication({ ...editingMedication, unit: e.target.value })}
                    placeholder={t('managers.injection.unitPlaceholder')}
                    className="w-20"
                  />
                  <div className="flex gap-1 ml-2">
                    {ACTIVITY_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={cn(
                          'w-6 h-6 rounded-full border-2',
                          editingMedication.color === color.value ? 'border-foreground' : 'border-transparent'
                        )}
                        style={{ backgroundColor: color.preview }}
                        onClick={() => setEditingMedication({ ...editingMedication, color: color.value })}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('managers.injection.dosesLabel', { unit: editingMedication.unit })}</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {editingMedication.availableDoses.map((dose) => (
                      <span key={dose} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                        {dose}
                        <button type="button" onClick={() => removeDoseFromEditing(dose)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={editingDoseInput}
                      onChange={(e) => setEditingDoseInput(e.target.value)}
                      placeholder={t('managers.injection.addDosePlaceholder')}
                      className="w-24"
                      onKeyDown={(e) => e.key === 'Enter' && addDoseToEditing()}
                    />
                    <Button size="sm" variant="outline" onClick={addDoseToEditing}>{t('common.add')}</Button>
                  </div>
                </div>
              </div>
            ) : (
              // Display mode
              <div className="flex items-center gap-2">
                <Syringe className={cn('h-5 w-5', medication.color)} />
                <div className="flex-1">
                  <span className="font-medium">{medication.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({medication.availableDoses.join(', ')} {medication.unit})
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditMedication(medication)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteMedicationClick(medication)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new medication form */}
      {isAddingMedication ? (
        <div className="p-3 border rounded-lg border-dashed space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={newMedication.name}
              onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
              placeholder={t('managers.injection.medicationNamePlaceholder')}
              className="flex-1"
              autoFocus
            />
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={addMedication} disabled={!newMedication.name.trim() || newMedication.availableDoses.length === 0}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsAddingMedication(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{t('managers.injection.unitLabel')}</Label>
            <Input
              value={newMedication.unit}
              onChange={(e) => setNewMedication({ ...newMedication, unit: e.target.value })}
              placeholder={t('managers.injection.unitPlaceholder')}
              className="w-20"
            />
            <div className="flex gap-1 ml-2">
              {ACTIVITY_COLORS.slice(0, 5).map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={cn(
                    'w-6 h-6 rounded-full border-2',
                    newMedication.color === color.value ? 'border-foreground' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color.preview }}
                  onClick={() => setNewMedication({ ...newMedication, color: color.value })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('managers.injection.dosesLabel', { unit: newMedication.unit })}</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {newMedication.availableDoses.map((dose) => (
                <span key={dose} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                  {dose}
                  <button type="button" onClick={() => removeDoseFromNew(dose)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                step="0.01"
                value={newDoseInput}
                onChange={(e) => setNewDoseInput(e.target.value)}
                placeholder={t('managers.injection.addDosePlaceholder')}
                className="w-24"
                onKeyDown={(e) => e.key === 'Enter' && addDoseToNew()}
              />
              <Button size="sm" variant="outline" onClick={addDoseToNew}>{t('common.add')}</Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAddingMedication(true)}
          disabled={localSettings.medications.length >= MAX_INJECTABLE_MEDICATIONS}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('managers.injection.addMedication')}
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('managers.injection.medicationCountLabel', { current: localSettings.medications.length, max: MAX_INJECTABLE_MEDICATIONS })}
      </p>
    </div>
  );

  const sitesContent = (
    <div className="space-y-4">
      {/* Site list */}
      <div className="space-y-2">
        {localSettings.injectionSites.map((site) => (
          <div
            key={site.id}
            className={cn(
              'p-3 border rounded-lg',
              editingSiteId === site.id && 'ring-2 ring-primary'
            )}
          >
            {editingSiteId === site.id && editingSite ? (
              // Editing mode
              <div className="flex items-center gap-2">
                <Syringe className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={editingSite.label}
                  onChange={(e) => setEditingSite({ ...editingSite, label: e.target.value })}
                  placeholder={t('managers.injection.siteNamePlaceholder')}
                  className="flex-1"
                  autoFocus
                />
                <Button variant="ghost" size="icon" onClick={saveEditSite} disabled={!editingSite.label.trim()}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={cancelEditSite}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              // Display mode
              <div className="flex items-center gap-2">
                <Syringe className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 font-medium">{site.label}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditSite(site)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteSiteClick(site)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new site form */}
      {isAddingSite ? (
        <div className="p-3 border rounded-lg border-dashed">
          <div className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-muted-foreground" />
            <Input
              value={newSite.label}
              onChange={(e) => setNewSite({ ...newSite, label: e.target.value })}
              placeholder={t('managers.injection.siteNameExamplePlaceholder')}
              className="flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addSite()}
            />
            <Button variant="ghost" size="icon" onClick={addSite} disabled={!newSite.label.trim()}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsAddingSite(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAddingSite(true)}
          disabled={localSettings.injectionSites.length >= MAX_INJECTION_SITES}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('managers.injection.addSite')}
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('managers.injection.siteCountLabel', { current: localSettings.injectionSites.length, max: MAX_INJECTION_SITES })}
      </p>
    </div>
  );

  const mainContent = (
    <Tabs defaultValue="medications" className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="medications">{t('managers.injection.medicationsTab')}</TabsTrigger>
        <TabsTrigger value="sites">{t('managers.injection.sitesTab')}</TabsTrigger>
      </TabsList>
      <TabsContent value="medications" className="mt-4">
        {medicationsContent}
      </TabsContent>
      <TabsContent value="sites" className="mt-4">
        {sitesContent}
      </TabsContent>
    </Tabs>
  );

  const TriggerButton = (
    <Button variant="outline" className="w-full justify-start">
      <div className="flex items-center gap-2">
        <Syringe className="h-4 w-4 text-teal-500" />
        <span>{t('managers.injection.medicationsConfigured', { count: settings.medications.length })}</span>
      </div>
      <span className="ml-auto text-muted-foreground">{t('managers.common.manage')}</span>
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('managers.injection.title')}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
              {mainContent}
            </div>
            <DrawerFooter>
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('managers.common.saveChanges')}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <AlertDialog open={!!deletingMedication} onOpenChange={(open) => !open && setDeletingMedication(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('managers.injection.deleteMedicationTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('managers.common.deleteConfirm', { name: deletingMedication?.name ?? '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={deleteMedication}>{t('common.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deletingSite} onOpenChange={(open) => !open && setDeletingSite(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('managers.injection.deleteSiteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('managers.common.deleteConfirm', { name: deletingSite?.label ?? '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={deleteSite}>{t('common.delete')}</AlertDialogAction>
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
            <DialogTitle>{t('managers.injection.title')}</DialogTitle>
          </DialogHeader>
          {mainContent}
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('managers.common.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMedication} onOpenChange={(open) => !open && setDeletingMedication(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('managers.injection.deleteMedicationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingMedication?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMedication}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingSite} onOpenChange={(open) => !open && setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('managers.injection.deleteSiteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingSite?.label}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSite}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
