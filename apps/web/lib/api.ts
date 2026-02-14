const API_BASE =
  typeof window === 'undefined'
    ? (process.env.API_INTERNAL_BASE_URL ?? 'http://localhost:4000/api')
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api-proxy');

export async function safeFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
