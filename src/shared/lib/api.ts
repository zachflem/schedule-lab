/**
 * Type-safe API client for the ScheduleLab SPA.
 * In dev, Vite proxy forwards /api/* to the Wrangler dev server.
 * In prod, same-origin Cloudflare Pages Functions handle /api/*.
 */

const BASE = '/api';

interface ApiError {
  error: string;
}

class ApiClient {
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${BASE}${path}`;
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>('GET', `${path}${queryString}`);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
