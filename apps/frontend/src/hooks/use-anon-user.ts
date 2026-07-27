import { useState } from 'react';
import { getOrCreateAnonUserId } from '@/lib/anon-user';

export function useAnonUserId(): string {
  const [userId] = useState<string>(() => getOrCreateAnonUserId());
  return userId;
}
