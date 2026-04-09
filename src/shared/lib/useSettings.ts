import { useState, useEffect } from 'react';
import { api } from './api';
import { type PlatformSettings } from '@/shared/validation/schemas';

let cache: PlatformSettings | null = null;
const listeners = new Set<(s: PlatformSettings) => void>();

export function useSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(cache);

  useEffect(() => {
    if (cache) return;
    api.get<PlatformSettings>('/settings').then(data => {
      cache = data;
      listeners.forEach(fn => fn(data));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    listeners.add(setSettings);
    return () => { listeners.delete(setSettings); };
  }, []);

  return settings;
}

export function invalidateSettings() {
  cache = null;
}
