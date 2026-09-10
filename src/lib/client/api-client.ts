/**
 * Typed client for the app's own API. Components never call `fetch` directly,
 * so error shaping and the request contract live in exactly one place.
 */

export type HistoryEntryDto = {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly visitedAt: string;
};

export type BookmarkDto = {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly createdAt: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : 'That request failed.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const api = {
  signup(email: string, password: string) {
    return request<{ user: { id: string; email: string } }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  listHistory(query = '') {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    return request<{ entries: readonly HistoryEntryDto[] }>(`/api/history${suffix}`);
  },

  recordVisit(url: string, title: string, isPrivate: boolean) {
    return request<{ recorded: boolean; entry?: HistoryEntryDto }>('/api/history', {
      method: 'POST',
      body: JSON.stringify({ url, title, isPrivate }),
    });
  },

  deleteHistoryEntry(id: string) {
    return request<{ deleted: string }>(`/api/history/${id}`, { method: 'DELETE' });
  },

  clearHistory() {
    return request<{ deleted: number }>('/api/history', { method: 'DELETE' });
  },

  listBookmarks(query = '') {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    return request<{ bookmarks: readonly BookmarkDto[] }>(`/api/bookmarks${suffix}`);
  },

  saveBookmark(url: string, title: string, isPrivate: boolean) {
    return request<{ saved: boolean; bookmark?: BookmarkDto }>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ url, title, isPrivate }),
    });
  },

  renameBookmark(id: string, title: string) {
    return request<{ bookmark: BookmarkDto }>(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  deleteBookmark(id: string) {
    return request<{ deleted: string }>(`/api/bookmarks/${id}`, { method: 'DELETE' });
  },
};
