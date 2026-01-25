export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function load<T>(key: string): T | null {
  return safeJsonParse<T>(localStorage.getItem(key));
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
