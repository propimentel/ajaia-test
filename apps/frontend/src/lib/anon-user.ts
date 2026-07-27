import { USER_ID_HEADER } from '@ajaia/shared';

const STORAGE_KEY = 'ajaia:anonUserId';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function getOrCreateAnonUserId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return crypto.randomUUID();
  }
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (isValidUuid(existing)) {
      return existing;
    }
    const next = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearAnonUserId(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function anonUserHeaders(): Record<string, string> {
  return { [USER_ID_HEADER]: getOrCreateAnonUserId() };
}

export { STORAGE_KEY as ANON_USER_ID_STORAGE_KEY };
