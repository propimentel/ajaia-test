import type {
  CreateDocumentDto,
  DocumentDto,
  DocumentMeta,
  UpdateDocumentDto,
} from '@ajaia/shared';
import { anonUserHeaders } from '@/lib/anon-user';

const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const API_BASE = rawApiUrl.startsWith('/') ? rawApiUrl : rawApiUrl.replace(/\/$/, '');

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...anonUserHeaders(),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => '');
    }
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText;
    throw new ApiError(res.status, res.statusText, message);
  }

  return (await res.json()) as T;
}

export const api = {
  list(): Promise<DocumentMeta[]> {
    return request<DocumentMeta[]>('/documents');
  },
  get(id: string): Promise<DocumentDto> {
    return request<DocumentDto>(`/documents/${id}`);
  },
  create(input: CreateDocumentDto = {}): Promise<DocumentDto> {
    return request<DocumentDto>('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(id: string, input: UpdateDocumentDto): Promise<DocumentDto> {
    return request<DocumentDto>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  remove(id: string): Promise<void> {
    return request<void>(`/documents/${id}`, { method: 'DELETE' });
  },
  health(): Promise<{ status: string; db: string }> {
    return request<{ status: string; db: string }>('/health');
  },
};

export { ApiError };
