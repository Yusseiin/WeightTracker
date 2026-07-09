"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

export function LogoutButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast(t('account.logoutSuccess'));
        router.push('/login');
        router.refresh();
      } else {
        showErrorToast(result.error || t('account.logoutError'));
      }
    } catch {
      showErrorToast(t('account.errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      disabled={isLoading}
      aria-label={t('account.logout')}
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
