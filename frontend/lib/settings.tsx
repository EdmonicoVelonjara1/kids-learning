import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import type { Language } from '@/lib/api';

export type ThemeMode = 'system' | 'light' | 'dark';

type Settings = {
  targetLanguage: Language;
  playerName: string;
  apiUrl: string;
  themeMode: ThemeMode;
  setTargetLanguage: (language: Language) => void;
  setPlayerName: (name: string) => void;
  setApiUrl: (url: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = 'lingo-kids/settings-v2';

const SettingsContext = createContext<Settings | null>(null);

type Persisted = {
  targetLanguage?: Language;
  playerName?: string;
  apiUrl?: string;
  themeMode?: ThemeMode;
};

async function loadSettings(): Promise<Persisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

async function saveSettings(settings: Persisted) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore persistence errors
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [targetLanguage, setTargetLanguage] = useState<Language>('fr');
  const [playerName, setPlayerName] = useState('Lila');
  const [apiUrl, setApiUrl] = useState('');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((saved) => {
      if (saved.targetLanguage) setTargetLanguage(saved.targetLanguage);
      if (saved.playerName) setPlayerName(saved.playerName);
      if (saved.apiUrl) setApiUrl(saved.apiUrl);
      if (saved.themeMode) setThemeMode(saved.themeMode);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      saveSettings({ targetLanguage, playerName, apiUrl, themeMode });
    }
  }, [targetLanguage, playerName, apiUrl, themeMode, loaded]);

  useEffect(() => {
    Appearance.setColorScheme(themeMode === 'system' ? null : themeMode);
  }, [themeMode]);

  return (
    <SettingsContext.Provider
      value={{
        targetLanguage,
        playerName,
        apiUrl,
        themeMode,
        setTargetLanguage,
        setPlayerName,
        setApiUrl,
        setThemeMode,
      }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return ctx;
}
