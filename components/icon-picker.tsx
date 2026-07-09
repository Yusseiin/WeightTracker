'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { DynamicIcon } from './dynamic-icon';
import { ACTIVITY_ICON_CATEGORIES } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  colorClass?: string;
}

export function IconPicker({ value, onChange, colorClass = 'text-foreground' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const filteredCategories = ACTIVITY_ICON_CATEGORIES.map((category) => ({
    ...category,
    icons: category.icons.filter((icon) =>
      icon.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((category) => category.icons.length > 0);

  const handleSelect = (icon: string) => {
    onChange(icon);
    setOpen(false);
    setSearch('');
  };

  // Inline the icon grid content to avoid focus loss on re-render
  const iconGridContent = (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('managers.iconPicker.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-75 overflow-y-auto space-y-4">
        {filteredCategories.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">{t('managers.iconPicker.noIconsFound')}</p>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.name}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {category.name}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {category.icons.map((icon) => (
                  <Button
                    key={icon}
                    variant={value === icon ? 'default' : 'outline'}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleSelect(icon)}
                  >
                    <DynamicIcon name={icon} className="h-5 w-5" />
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const TriggerButton = (
    <Button variant="outline" size="icon" className="h-10 w-10">
      <DynamicIcon name={value} className={cn('h-5 w-5', colorClass)} />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('managers.iconPicker.title')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {iconGridContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        {iconGridContent}
      </PopoverContent>
    </Popover>
  );
}
