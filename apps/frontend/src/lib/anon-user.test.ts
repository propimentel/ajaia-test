import { describe, it, expect, beforeEach } from 'vitest';
import {
  ANON_USER_ID_STORAGE_KEY,
  anonUserHeaders,
  clearAnonUserId,
  getOrCreateAnonUserId,
} from '@/lib/anon-user';
import { USER_ID_HEADER } from '@ajaia/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('anon-user', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('generates a new UUID and persists it on first call', () => {
    const id = getOrCreateAnonUserId();
    expect(id).toMatch(UUID_RE);
    expect(window.localStorage.getItem(ANON_USER_ID_STORAGE_KEY)).toBe(id);
  });

  it('returns the same UUID on subsequent calls', () => {
    const first = getOrCreateAnonUserId();
    const second = getOrCreateAnonUserId();
    expect(second).toBe(first);
  });

  it('regenerates when the stored value is not a valid UUID', () => {
    window.localStorage.setItem(ANON_USER_ID_STORAGE_KEY, 'not-a-uuid');
    const id = getOrCreateAnonUserId();
    expect(id).toMatch(UUID_RE);
    expect(id).not.toBe('not-a-uuid');
  });

  it('clearAnonUserId removes the stored value', () => {
    getOrCreateAnonUserId();
    clearAnonUserId();
    expect(window.localStorage.getItem(ANON_USER_ID_STORAGE_KEY)).toBeNull();
  });

  it('clearAnonUserId is a no-op when nothing is stored', () => {
    expect(() => clearAnonUserId()).not.toThrow();
  });

  it('anonUserHeaders returns a record with the X-User-Id header', () => {
    const headers = anonUserHeaders();
    expect(headers[USER_ID_HEADER]).toMatch(UUID_RE);
  });
});
