"use client";

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SettingsButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.push('/settings')}
    >
      <Settings className="h-5 w-5 pointer-events-none" />
    </Button>
  );
}
