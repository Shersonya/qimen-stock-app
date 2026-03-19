'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  WORKSPACE_SETTINGS_STORAGE_KEY,
  buildPatternConfigOverride,
  buildRiskConfigOverride,
  createDefaultWorkspaceSettings,
  sanitizeWorkspaceSettings,
  serializeWorkspaceSettings,
  type WorkspaceSettings,
} from '@/lib/workspace-settings';

type WorkspaceSettingsContextValue = {
  settings: WorkspaceSettings;
  hydrated: boolean;
  setSettings: (nextSettings: WorkspaceSettings) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (rawValue: string) => { ok: true } | { ok: false; message: string };
  patternConfigOverride: ReturnType<typeof buildPatternConfigOverride>;
  riskConfigOverride: ReturnType<typeof buildRiskConfigOverride>;
};

const WorkspaceSettingsContext = createContext<WorkspaceSettingsContextValue | null>(
  null,
);

export function WorkspaceSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<WorkspaceSettings>(
    createDefaultWorkspaceSettings(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(WORKSPACE_SETTINGS_STORAGE_KEY);

      if (rawValue) {
        setSettings(sanitizeWorkspaceSettings(JSON.parse(rawValue)));
      }
    } catch {
      setSettings(createDefaultWorkspaceSettings());
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        WORKSPACE_SETTINGS_STORAGE_KEY,
        serializeWorkspaceSettings(settings),
      );
    } catch {
      // Ignore persistence errors so analysis workflows stay available.
    }
  }, [hydrated, settings]);

  const value = useMemo<WorkspaceSettingsContextValue>(() => {
    return {
      settings,
      hydrated,
      setSettings,
      resetSettings: () => setSettings(createDefaultWorkspaceSettings()),
      exportSettings: () => serializeWorkspaceSettings(settings),
      importSettings: (rawValue: string) => {
        try {
          const nextSettings = sanitizeWorkspaceSettings(JSON.parse(rawValue));
          setSettings(nextSettings);
          return { ok: true };
        } catch {
          return { ok: false, message: '导入内容不是有效的 JSON 配置。' };
        }
      },
      patternConfigOverride: buildPatternConfigOverride(settings),
      riskConfigOverride: buildRiskConfigOverride(settings),
    };
  }, [hydrated, settings]);

  return (
    <WorkspaceSettingsContext.Provider value={value}>
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}

export function useWorkspaceSettings() {
  const context = useContext(WorkspaceSettingsContext);

  if (!context) {
    throw new Error('useWorkspaceSettings must be used within WorkspaceSettingsProvider.');
  }

  return context;
}
