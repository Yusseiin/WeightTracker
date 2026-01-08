"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
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
        showSuccessToast('Logged out successfully');
        router.push('/login');
        router.refresh();
      } else {
        showErrorToast(result.error || 'Logout failed');
      }
    } catch {
      showErrorToast('An error occurred');
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
      aria-label="Logout"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
