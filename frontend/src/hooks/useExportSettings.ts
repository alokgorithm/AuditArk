import { useEffect, useMemo, useState } from 'react';

export type ExportSettings = {
  askEveryTime: boolean;
  defaultPath: string | null;
};

const SETTINGS_KEY = 'export_settings_v1';

const DEFAULT_SETTINGS: ExportSettings = {
  askEveryTime: true,
  defaultPath: null,
};

const readSettings = (): ExportSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ExportSettings>;
    return {
      askEveryTime: parsed.askEveryTime ?? true,
      defaultPath: parsed.defaultPath ?? null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const useExportSettings = () => {
  const [settings, setSettings] = useState<ExportSettings>(readSettings);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore local storage failures in restricted runtimes.
    }
  }, [settings]);

  const api = useMemo(() => ({
    settings,
    setAskEveryTime: (askEveryTime: boolean) => {
      setSettings(prev => ({ ...prev, askEveryTime }));
    },
    setDefaultPath: (defaultPath: string | null) => {
      setSettings(prev => ({ ...prev, defaultPath }));
    },
  }), [settings]);

  return api;
};
