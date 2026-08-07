import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useSettings } from '@/lib/settings';
import { fetchProgress, isApiConfigured, type ProgressSummary } from '@/lib/api';

export default function SettingsScreen() {
  const { apiUrl, setApiUrl, targetLanguage, setTargetLanguage, playerName, setPlayerName } =
    useSettings();
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
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Profil de l’enfant</Text>
      <View style={styles.fieldRow}>
        <TextInput
          style={styles.input}
          value={nameDraft}
          onChangeText={setNameDraft}
          onEndEditing={saveName}
          placeholder="Prénom de l’enfant"
          placeholderTextColor="#90A4AE"
        />
      </View>

      <Text style={styles.sectionTitle}>Langue à apprendre</Text>
      <View style={styles.languageRow}>
        <Pressable
          style={[styles.languageButton, targetLanguage === 'fr' && styles.languageButtonActive]}
          onPress={() => setTargetLanguage('fr')}>
          <Text style={[styles.languageText, targetLanguage === 'fr' && styles.languageTextActive]}>
            🇫🇷 Français
          </Text>
        </Pressable>
        <Pressable
          style={[styles.languageButton, targetLanguage === 'en' && styles.languageButtonActive]}
          onPress={() => setTargetLanguage('en')}>
          <Text style={[styles.languageText, targetLanguage === 'en' && styles.languageTextActive]}>
            🇬🇧 English
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Serveur</Text>
      <View style={[styles.modeBadge, isApiConfigured(apiUrl) ? styles.modeBadgeServer : styles.modeBadgeOffline]}>
        <Text style={styles.modeBadgeText}>
          {isApiConfigured(apiUrl) ? `🖥️ Mode serveur : ${apiUrl}` : '📱 Mode hors ligne (données locales)'}
        </Text>
      </View>
      <View style={styles.fieldRow}>
        <TextInput
          style={styles.input}
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
      <Text style={styles.hint}>Adresse du backend Rust. Laisser vide pour fonctionner sans serveur.</Text>

      <Text style={styles.sectionTitle}>Progression de {playerName}</Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : progress ? (
        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{progress.total_answers}</Text>
            <Text style={styles.statLabel}>réponses</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{Math.round(progress.accuracy * 100)}%</Text>
            <Text style={styles.statLabel}>réussite</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{progress.mastered_count}</Text>
            <Text style={styles.statLabel}>mots maîtrisés</Text>
          </View>
        </View>
      ) : null}

      <Pressable style={styles.refreshButton} onPress={loadProgress}>
        <Text style={styles.refreshButtonText}>Actualiser</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
    marginTop: 24,
    marginBottom: 10,
  },
  fieldRow: {
    backgroundColor: '#ECEFF1',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  input: {
    fontSize: 18,
    paddingVertical: 14,
    color: '#263238',
  },
  hint: {
    fontSize: 13,
    opacity: 0.55,
    marginTop: 6,
  },
  modeBadge: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  modeBadgeOffline: {
    backgroundColor: '#E8F5E9',
  },
  modeBadgeServer: {
    backgroundColor: '#FFF3E0',
  },
  modeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#37474F',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#ECEFF1',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    borderColor: '#3A86FF',
    backgroundColor: '#E3F2FD',
  },
  languageText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#546E7A',
  },
  languageTextActive: {
    color: '#1565C0',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    paddingVertical: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#E65100',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
    color: '#795548',
  },
  refreshButton: {
    marginTop: 20,
    backgroundColor: '#3A86FF',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 15,
    color: '#C62828',
  },
});
