import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';

import WordCard, { speak } from '@/components/WordCard';
import { Text, View } from '@/components/Themed';
import { useSettings } from '@/lib/settings';
import { fetchCategories, fetchWords, type Category, type Word } from '@/lib/api';

export default function LearnScreen() {
  const { apiUrl, targetLanguage } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchCategories(apiUrl));
    } catch {
      setError('Impossible de joindre le serveur. Vérifie l’adresse dans Réglages.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (words.length > 0) {
      speak(words[index][targetLanguage], targetLanguage);
    }
  }, [words, index, targetLanguage]);

  const openCategory = useCallback(
    async (category: Category) => {
      setSelected(category);
      setLoading(true);
      setError(null);
      try {
        const list = await fetchWords(apiUrl, category.id);
        setWords(list);
        setIndex(0);
      } catch {
        setError('Impossible de charger les mots de cette catégorie.');
        setSelected(null);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const next = () => setIndex((i) => (i + 1) % words.length);
  const prev = () => setIndex((i) => (i - 1 + words.length) % words.length);

  if (selected) {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (words.length === 0) {
      return (
        <View style={styles.center}>
          <Text>Cette catégorie est vide.</Text>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <WordCard word={words[index]} targetLanguage={targetLanguage} index={index} total={words.length} />
        <View style={styles.navRow}>
          <Pressable style={styles.navButton} onPress={prev}>
            <Text style={styles.navButtonText}>◀ Précédent</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={next}>
            <Text style={styles.navButtonText}>Suivant ▶</Text>
          </Pressable>
        </View>
        <Pressable style={styles.backButton} onPress={() => setSelected(null)}>
          <Text style={styles.backButtonText}>← Toutes les catégories</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadCategories}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={categories}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.column}
      ListHeaderComponent={
        <Text style={styles.title}>
          {targetLanguage === 'fr' ? 'Qu’est-ce qu’on apprend ?' : 'What shall we learn?'}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.categoryCard, { backgroundColor: item.color }]}
          onPress={() => openCategory(item)}>
          <Text style={styles.categoryName}>
            {targetLanguage === 'fr' ? item.name_fr : item.name_en}
          </Text>
          <Text style={styles.categoryCount}>{item.word_count} mots</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  column: {
    gap: 14,
    marginBottom: 14,
  },
  categoryCard: {
    flex: 1,
    aspectRatio: 1.1,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  categoryCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4E342E',
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3A86FF',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
