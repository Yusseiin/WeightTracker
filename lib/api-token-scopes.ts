// Client-safe definitions for scoped API tokens (issue #22). No Node imports
// here, so the management UI can use them; storage lives in api-tokens.ts.

// Every secret starts with this, which is how a scoped token is told apart
// from the legacy API_KEY.
export const TOKEN_PREFIX = 'wt_';

export const TOKEN_RESOURCES = [
  'weight',
  'water',
  'steps',
  'pressure',
  'medications',
  'injections',
  'body-measurements',
] as const;

export type TokenResource = (typeof TOKEN_RESOURCES)[number];
// 'write' includes 'read'.
export type TokenAccess = 'read' | 'write';
export type TokenScopes = Partial<Record<TokenResource, TokenAccess>>;

export const MAX_TOKEN_NAME = 60;

// A token as the management UI/API sees it - never the secret or its hash.
export interface ApiTokenInfo {
  id: string;
  name: string;
  username: string;      // whose data the token reaches
  scopes: TokenScopes;
  prefix: string;        // first characters of the secret, for recognising it
  enabled: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export function isTokenResource(v: unknown): v is TokenResource {
  return typeof v === 'string' && (TOKEN_RESOURCES as readonly string[]).includes(v);
}

// Keeps only known resources with a valid access level; 'none' means omitted.
export function parseScopes(raw: unknown): TokenScopes | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const scopes: TokenScopes = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isTokenResource(key)) return null;
    if (value === 'none' || value === null || value === undefined) continue;
    if (value !== 'read' && value !== 'write') return null;
    scopes[key] = value;
  }
  return scopes;
}

export function hasAccess(scopes: TokenScopes, resource: TokenResource, access: TokenAccess): boolean {
  const granted = scopes[resource];
  return granted === 'write' || (granted === 'read' && access === 'read');
}
