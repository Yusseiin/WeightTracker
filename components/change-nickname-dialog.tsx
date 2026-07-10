"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

type FormData = {
  nickname: string;
};

interface ChangeNicknameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNickname: string;
}

export function ChangeNicknameDialog({ open, onOpenChange, currentNickname }: ChangeNicknameDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z.object({
    nickname: z.string()
      .min(1, t('validation.nicknameRequired'))
      .max(50, t('validation.nicknameMax')),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nickname: currentNickname,
    },
  });

  const onSubmit = async (data: FormData) => {
    if (data.nickname.trim() === currentNickname) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: data.nickname.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast(t('account.changeNicknameSuccess'));
        onOpenChange(false);
        router.refresh();
      } else {
        showErrorToast(result.error || t('account.changeNicknameError'));
      }
    } catch {
      showErrorToast(t('account.changeNicknameError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>{t('settings.changeNickname')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.nickname')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('account.nicknamePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin pointer-events-none" />}
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
