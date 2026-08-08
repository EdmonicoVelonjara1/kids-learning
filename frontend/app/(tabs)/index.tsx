import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import WordCard, { speak } from '@/components/WordCard';
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
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (words.length === 0) {
      return (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-base text-slate-700 dark:text-slate-300">Cette catégorie est vide.</Text>
        </View>
      );
    }
    return (
      <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="p-5">
        <WordCard word={words[index]} targetLanguage={targetLanguage} index={index} total={words.length} />
        <View className="mx-auto w-full max-w-md">
          <View className="mt-3 flex-row gap-3">
            <Pressable className="flex-1 items-center rounded-full bg-amber-400 py-3.5" onPress={prev}>
              <Text className="text-lg font-bold text-[#4E342E]">◀ Précédent</Text>
            </Pressable>
            <Pressable className="flex-1 items-center rounded-full bg-amber-400 py-3.5" onPress={next}>
              <Text className="text-lg font-bold text-[#4E342E]">Suivant ▶</Text>
            </Pressable>
          </View>
          <Pressable className="mt-3 items-center py-3" onPress={() => setSelected(null)}>
            <Text className="text-base opacity-70 dark:text-white">← Toutes les catégories</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="mb-4 text-center text-base text-slate-700 dark:text-slate-300">{error}</Text>
        <Pressable className="rounded-full bg-blue-500 px-6 py-3" onPress={loadCategories}>
          <Text className="text-base font-bold text-white">Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      className="w-full max-w-lg self-center"
      contentContainerClassName="p-5 pb-10"
      data={categories}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 14, marginBottom: 14 }}
      ListHeaderComponent={
        <Text className="mb-5 text-center text-2xl font-extrabold dark:text-white">
          {targetLanguage === 'fr' ? 'Qu’est-ce qu’on apprend ?' : 'What shall we learn?'}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          className="aspect-[1.1] flex-1 justify-end rounded-3xl p-4 shadow-lg shadow-black/10"
          style={{ backgroundColor: item.color }}
          onPress={() => openCategory(item)}>
          <Text className="text-xl font-extrabold text-white">
            {targetLanguage === 'fr' ? item.name_fr : item.name_en}
          </Text>
          <Text className="mt-1 text-sm text-white/85">{item.word_count} mots</Text>
        </Pressable>
      )}
    />
  );
}
