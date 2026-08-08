import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useSettings, type ThemeMode } from '@/lib/settings';
import { useScale } from '@/lib/responsive';
import { fetchProgress, isApiConfigured, type ProgressSummary } from '@/lib/api';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '🖥️ Système' },
  { value: 'light', label: '☀️ Clair' },
  { value: 'dark', label: '🌙 Sombre' },
];

export default function SettingsScreen() {
  const {
    apiUrl,
    setApiUrl,
    targetLanguage,
    setTargetLanguage,
    playerName,
    setPlayerName,
    themeMode,
    setThemeMode,
  } = useSettings();
  const scale = useScale();
  const [urlDraft, setUrlDraft] = useState(apiUrl);
  const [nameDraft, setNameDraft] = useState(playerName);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProgress(await fetchProgress(apiUrl, playerName));
    } catch {
      setError('Serveur injoignable : progression indisponible.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, playerName]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const saveUrl = () => {
    const trimmed = urlDraft.trim();
    if (trimmed !== apiUrl) {
      if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        setApiUrl(trimmed);
      }
    }
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== playerName) setPlayerName(trimmed);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="p-6">
      <Text className="mb-2.5 mt-6 text-base font-extrabold uppercase tracking-wide opacity-70 dark:text-white">
        Profil de l’enfant
      </Text>
      <View className="rounded-[14px] bg-slate-100 dark:bg-slate-800 px-3.5">
        <TextInput
          className="py-3.5 text-lg text-slate-800 dark:text-slate-100"
          value={nameDraft}
          onChangeText={setNameDraft}
          onEndEditing={saveName}
          placeholder="Prénom de l’enfant"
          placeholderTextColor="#90A4AE"
        />
      </View>

      <Text className="mb-2.5 mt-6 text-base font-extrabold uppercase tracking-wide opacity-70 dark:text-white">
        Langue à apprendre
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          className={`flex-1 items-center rounded-[14px] border-2 bg-slate-100 dark:bg-slate-800 py-4 ${targetLanguage === 'fr' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-transparent'}`}
          onPress={() => setTargetLanguage('fr')}>
          <Text
            className={`font-bold text-slate-500 dark:text-slate-300 ${targetLanguage === 'fr' ? 'text-blue-700 dark:text-blue-200' : ''}`}
            style={{ fontSize: Math.round(18 * scale) }}>
            🇫🇷 Français
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-[14px] border-2 bg-slate-100 dark:bg-slate-800 py-4 ${targetLanguage === 'en' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-transparent'}`}
          onPress={() => setTargetLanguage('en')}>
          <Text
            className={`font-bold text-slate-500 dark:text-slate-300 ${targetLanguage === 'en' ? 'text-blue-700 dark:text-blue-200' : ''}`}
            style={{ fontSize: Math.round(18 * scale) }}>
            🇬🇧 English
          </Text>
        </Pressable>
      </View>

      <Text className="mb-2.5 mt-6 text-base font-extrabold uppercase tracking-wide opacity-70 dark:text-white">
        Mode d’affichage
      </Text>
      <View className="flex-row gap-3">
        {THEME_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            className={`flex-1 items-center rounded-[14px] border-2 bg-slate-100 dark:bg-slate-800 py-4 ${themeMode === opt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-transparent'}`}
            onPress={() => setThemeMode(opt.value)}>
            <Text
              className={`font-bold text-slate-500 dark:text-slate-300 ${themeMode === opt.value ? 'text-blue-700 dark:text-blue-200' : ''}`}
              style={{ fontSize: Math.round(16 * scale) }}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-2.5 mt-6 text-base font-extrabold uppercase tracking-wide opacity-70 dark:text-white">
        Serveur
      </Text>
      <View
        className={`mb-2.5 rounded-xl px-3.5 py-2.5 ${isApiConfigured(apiUrl) ? 'bg-orange-50 dark:bg-orange-900' : 'bg-green-50 dark:bg-green-900'}`}>
        <Text className="text-sm font-bold text-slate-700 dark:text-orange-100">
          {isApiConfigured(apiUrl) ? `🖥️ Mode serveur : ${apiUrl}` : '📱 Mode hors ligne (données locales)'}
        </Text>
      </View>
      <View className="rounded-[14px] bg-slate-100 dark:bg-slate-800 px-3.5">
        <TextInput
          className="py-3.5 text-lg text-slate-800 dark:text-slate-100"
          value={urlDraft}
          onChangeText={setUrlDraft}
          onEndEditing={saveUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.1.10:8787"
          placeholderTextColor="#90A4AE"
        />
      </View>
      <Text className="mt-1.5 text-[13px] opacity-55 dark:text-slate-300">
        Adresse du backend Rust. Laisser vide pour fonctionner sans serveur.
      </Text>

      <Text className="mb-2.5 mt-6 text-base font-extrabold uppercase tracking-wide opacity-70 dark:text-white">
        Progression de {playerName}
      </Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text className="text-[15px] text-red-700 dark:text-red-400">{error}</Text>
      ) : progress ? (
        <View className="flex-row justify-around rounded-[20px] bg-orange-50 dark:bg-orange-900 py-5">
          <View className="items-center">
            <Text
              className="font-black text-orange-600 dark:text-orange-300"
              style={{ fontSize: Math.round(28 * scale) }}>
              {progress.total_answers}
            </Text>
            <Text className="mt-0.5 text-[13px] text-amber-800 dark:text-orange-200">réponses</Text>
          </View>
          <View className="items-center">
            <Text
              className="font-black text-orange-600 dark:text-orange-300"
              style={{ fontSize: Math.round(28 * scale) }}>
              {Math.round(progress.accuracy * 100)}%
            </Text>
            <Text className="mt-0.5 text-[13px] text-amber-800 dark:text-orange-200">réussite</Text>
          </View>
          <View className="items-center">
            <Text
              className="font-black text-orange-600 dark:text-orange-300"
              style={{ fontSize: Math.round(28 * scale) }}>
              {progress.mastered_count}
            </Text>
            <Text className="mt-0.5 text-[13px] text-amber-800 dark:text-orange-200">mots maîtrisés</Text>
          </View>
        </View>
      ) : null}

      <Pressable className="mt-5 items-center rounded-full bg-blue-500 py-3.5" onPress={loadProgress}>
        <Text className="text-base font-extrabold text-white">Actualiser</Text>
      </Pressable>
    </ScrollView>
  );
}
