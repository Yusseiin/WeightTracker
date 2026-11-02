"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, KeyRound, Pencil, RefreshCw, Trash2, Copy, Check, AlertTriangle, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { useTranslation } from '@/hooks/use-translation';
import { formatDateForTable } from '@/lib/date-utils';
import {
  TOKEN_RESOURCES, MAX_TOKEN_NAME,
  type ApiTokenInfo, type TokenResource, type TokenScopes,
} from '@/lib/api-token-scopes';
import type { DateFormatSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

type Level = 'none' | 'read' | 'write';
type ScopeForm = Record<TokenResource, Level>;

interface TokenUser {
  username: string;
  nickname: string;
  role: string;
}

interface FormState {
  name: string;
  username: string;
  scopes: ScopeForm;
}

// Endpoint used for the example request shown with a new secret.
const RESOURCE_ENDPOINT: Record<TokenResource, string> = {
  weight: '/api/entries',
  water: '/api/water',
  steps: '/api/steps',
  pressure: '/api/pressure',
  medications: '/api/medications',
  injections: '/api/injections',
  'body-measurements': '/api/body-measurements',
};

const emptyScopes = (): ScopeForm =>
  Object.fromEntries(TOKEN_RESOURCES.map((r) => [r, 'none'])) as ScopeForm;
const toForm = (scopes: TokenScopes): ScopeForm => ({ ...emptyScopes(), ...scopes });
const toScopes = (form: ScopeForm): TokenScopes =>
  Object.fromEntries(Object.entries(form).filter(([, level]) => level !== 'none')) as TokenScopes;

// Call the token management API and unwrap { success, data }.
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export function ApiTokensPage({ dateFormat }: { dateFormat?: DateFormatSettings }) {
  const router = useRouter();
  const { t } = useTranslation();

  const [tokens, setTokens] = useState<ApiTokenInfo[]>([]);
  const [users, setUsers] = useState<TokenUser[]>([]);
  const [legacyKeyConfigured, setLegacyKeyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', username: '', scopes: emptyScopes() });
  const [saving, setSaving] = useState(false);

  // A freshly created/regenerated secret - shown once, then forgotten.
  const [reveal, setReveal] = useState<{ name: string; secret: string; scopes: TokenScopes } | null>(null);
  const [copied, setCopied] = useState(false);
  const secretInputRef = useRef<HTMLInputElement>(null);
  const [origin, setOrigin] = useState('');

  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'regenerate'; token: ApiTokenInfo } | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    try {
      const data = await api<{ tokens: ApiTokenInfo[]; users: TokenUser[]; legacyKeyConfigured: boolean }>(
        '/api/tokens'
      );
      setTokens(data.tokens);
      setUsers(data.users);
      setLegacyKeyConfigured(data.legacyKeyConfigured);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : t('apiTokens.toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (iso: string) => formatDateForTable(iso, dateFormat);
  const resourceLabel = (r: TokenResource) => t(`settings.export.types.${r}`);
  const userLabel = (username: string) => {
    const user = users.find((u) => u.username === username);
    return user && user.nickname !== username ? `${user.nickname} (@${username})` : `@${username}`;
  };

  // ---- editor ----

  const openCreate = () => {
    setForm({ name: '', username: users[0]?.username ?? '', scopes: emptyScopes() });
    setEditor({ mode: 'create' });
  };

  const openEdit = (token: ApiTokenInfo) => {
    setForm({ name: token.name, username: token.username, scopes: toForm(token.scopes) });
    setEditor({ mode: 'edit', id: token.id });
  };

  const setScope = (resource: TokenResource, level: Level) =>
    setForm((prev) => ({ ...prev, scopes: { ...prev.scopes, [resource]: level } }));

  const setAllScopes = (level: Level) =>
    setForm((prev) => ({
      ...prev,
      scopes: Object.fromEntries(TOKEN_RESOURCES.map((r) => [r, level])) as ScopeForm,
    }));

  const formScopes = toScopes(form.scopes);
  const hasScope = Object.keys(formScopes).length > 0;
  const canSave = form.name.trim() !== '' && form.username !== '' && hasScope;

  const handleSave = async () => {
    if (!editor || !canSave) return;
    setSaving(true);
    try {
      const body = JSON.stringify({ name: form.name.trim(), username: form.username, scopes: formScopes });
      if (editor.mode === 'create') {
        const { token, secret } = await api<{ token: ApiTokenInfo; secret: string }>('/api/tokens', {
          method: 'POST',
          body,
        });
        setTokens((prev) => [...prev, token]);
        setReveal({ name: token.name, secret, scopes: token.scopes });
        showSuccessToast(t('apiTokens.toasts.created'));
      } else {
        const token = await api<ApiTokenInfo>(`/api/tokens/${editor.id}`, { method: 'PATCH', body });
        setTokens((prev) => prev.map((x) => (x.id === token.id ? token : x)));
        showSuccessToast(t('apiTokens.toasts.updated'));
      }
      setEditor(null);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : t('apiTokens.toasts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // ---- row actions ----

  const toggleEnabled = async (token: ApiTokenInfo, enabled: boolean) => {
    setTokens((prev) => prev.map((x) => (x.id === token.id ? { ...x, enabled } : x)));
    try {
      const updated = await api<ApiTokenInfo>(`/api/tokens/${token.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      setTokens((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (error) {
      setTokens((prev) => prev.map((x) => (x.id === token.id ? token : x)));
      showErrorToast(error instanceof Error ? error.message : t('apiTokens.toasts.saveError'));
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, token } = confirm;
    try {
      if (kind === 'delete') {
        await api(`/api/tokens/${token.id}`, { method: 'DELETE' });
        setTokens((prev) => prev.filter((x) => x.id !== token.id));
        showSuccessToast(t('apiTokens.toasts.deleted'));
      } else {
        const { token: updated, secret } = await api<{ token: ApiTokenInfo; secret: string }>(
          `/api/tokens/${token.id}/regenerate`,
          { method: 'POST' }
        );
        setTokens((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        setReveal({ name: updated.name, secret, scopes: updated.scopes });
        showSuccessToast(t('apiTokens.toasts.regenerated'));
      }
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : t('apiTokens.toasts.saveError'));
    } finally {
      setConfirm(null);
    }
  };

  // ---- secret reveal ----

  // The Clipboard API only exists on HTTPS/localhost; self-hosted installs are
  // often plain HTTP on a LAN, so fall back to selecting + execCommand.
  const copySecret = async () => {
    if (!reveal) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reveal.secret);
      } else {
        secretInputRef.current?.select();
        if (!document.execCommand('copy')) throw new Error('copy failed');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      secretInputRef.current?.select();
      showErrorToast(t('apiTokens.copyFailed'));
    }
  };

  const closeReveal = () => {
    setReveal(null);
    setCopied(false);
  };

  const exampleResource = reveal ? (Object.keys(reveal.scopes)[0] as TokenResource | undefined) : undefined;
  const exampleCommand = reveal && exampleResource
    ? `curl -H "Authorization: Bearer ${reveal.secret}" ${origin}${RESOURCE_ENDPOINT[exampleResource]}`
    : '';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} aria-label={t('common.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t('apiTokens.title')}</h1>
          </div>
          <Button size="sm" onClick={openCreate} disabled={loading || users.length === 0}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('apiTokens.newToken')}
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-4 space-y-3">
        <p className="text-sm text-muted-foreground">{t('apiTokens.description')}</p>

        {legacyKeyConfigured && (
          <Card className="py-3 border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-medium">{t('apiTokens.legacyTitle')}</div>
                <p className="text-xs text-muted-foreground">{t('apiTokens.legacyBody')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tokens.length === 0 ? (
          <Card className="py-10">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('apiTokens.empty')}</p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('apiTokens.newToken')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          tokens.map((token) => (
            <Card key={token.id} className={cn('py-4', !token.enabled && 'opacity-60')}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">{token.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('apiTokens.forUser', { user: userLabel(token.username) })}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {token.enabled ? t('common.enabled') : t('common.disabled')}
                    </span>
                    <Switch
                      checked={token.enabled}
                      onCheckedChange={(checked) => toggleEnabled(token, checked)}
                      aria-label={token.enabled ? t('common.enabled') : t('common.disabled')}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TOKEN_RESOURCES.filter((r) => token.scopes[r]).map((r) => (
                    <Badge key={r} variant={token.scopes[r] === 'write' ? 'default' : 'secondary'}>
                      {resourceLabel(r)} · {token.scopes[r] === 'write' ? t('apiTokens.accessWrite') : t('apiTokens.accessRead')}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <code className="font-mono">{token.prefix}…</code>
                  <span>{t('apiTokens.created', { date: formatDate(token.createdAt) })}</span>
                  <span>
                    {token.lastUsedAt
                      ? t('apiTokens.lastUsed', { date: formatDate(token.lastUsedAt) })
                      : t('apiTokens.neverUsed')}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(token)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t('common.edit')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: 'regenerate', token })}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {t('apiTokens.regenerate')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirm({ kind: 'delete', token })}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      {/* Create / edit */}
      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === 'edit' ? t('apiTokens.editTitle') : t('apiTokens.createTitle')}
            </DialogTitle>
            <DialogDescription>{t('apiTokens.editorDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">{t('apiTokens.name')}</Label>
              <Input
                id="token-name"
                value={form.name}
                maxLength={MAX_TOKEN_NAME}
                placeholder={t('apiTokens.namePlaceholder')}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('apiTokens.user')}</Label>
              <Select value={form.username} onValueChange={(username) => setForm((prev) => ({ ...prev, username }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.username} value={u.username}>
                      {userLabel(u.username)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('apiTokens.userHint')}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t('apiTokens.access')}</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAllScopes('read')}>
                    {t('apiTokens.allRead')}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAllScopes('write')}>
                    {t('apiTokens.allWrite')}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAllScopes('none')}>
                    {t('apiTokens.clear')}
                  </Button>
                </div>
              </div>
              <div className="divide-y rounded-md border">
                {TOKEN_RESOURCES.map((r) => (
                  <div key={r} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm">{resourceLabel(r)}</span>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={form.scopes[r]}
                      onValueChange={(level) => level && setScope(r, level as Level)}
                    >
                      <ToggleGroupItem value="none" className="px-2.5 text-xs">{t('apiTokens.accessNone')}</ToggleGroupItem>
                      <ToggleGroupItem value="read" className="px-2.5 text-xs">{t('apiTokens.accessRead')}</ToggleGroupItem>
                      <ToggleGroupItem value="write" className="px-2.5 text-xs">{t('apiTokens.accessWrite')}</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                ))}
              </div>
              <p className={cn('text-xs', hasScope ? 'text-muted-foreground' : 'text-destructive')}>
                {hasScope ? t('apiTokens.accessHint') : t('apiTokens.needScope')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditor(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editor?.mode === 'edit' ? t('common.save') : t('apiTokens.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show a new secret, once */}
      <Dialog open={!!reveal} onOpenChange={(open) => !open && closeReveal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('apiTokens.secretTitle')}</DialogTitle>
            <DialogDescription>{reveal?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>{t('apiTokens.secretWarning')}</span>
            </div>
            <div className="flex gap-2">
              <Input
                ref={secretInputRef}
                readOnly
                value={reveal?.secret ?? ''}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button type="button" variant="outline" onClick={copySecret} className="shrink-0">
                {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? t('apiTokens.copied') : t('apiTokens.copy')}
              </Button>
            </div>
            {exampleCommand && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('apiTokens.example')}</div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono text-xs">
                  {exampleCommand}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={closeReveal}>{t('apiTokens.done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete / regenerate */}
      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'delete' ? t('apiTokens.deleteTitle') : t('apiTokens.regenerateTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'delete'
                ? t('apiTokens.deleteBody', { name: confirm?.token.name ?? '' })
                : t('apiTokens.regenerateBody', { name: confirm?.token.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              className={cn(confirm?.kind === 'delete' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              {confirm?.kind === 'delete' ? t('common.delete') : t('apiTokens.regenerate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
