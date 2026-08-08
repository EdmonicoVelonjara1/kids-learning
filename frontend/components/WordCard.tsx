import * as Speech from 'expo-speech';
import { Pressable, Text, View } from 'react-native';

import MotionVisual from '@/components/MotionVisual';
import type { Language, Word } from '@/lib/api';
import { useScale } from '@/lib/responsive';

type Props = {
  word: Word;
  targetLanguage: Language;
  index: number;
  total: number;
};

const LANGUAGE_META: Record<Language, { label: string; flag: string; code: string }> = {
  fr: { label: 'Français', flag: '🇫🇷', code: 'fr-FR' },
  en: { label: 'English', flag: '🇬🇧', code: 'en-US' },
};

export function speak(text: string, language: Language, pitch = 1.0, rate = 0.85) {
  Speech.stop();
  Speech.speak(text, { language: LANGUAGE_META[language].code, pitch, rate });
}

export default function WordCard({ word, targetLanguage, index, total }: Props) {
  const otherLanguage: Language = targetLanguage === 'fr' ? 'en' : 'fr';
  const main = word[targetLanguage];
  const translation = word[otherLanguage];
  const scale = useScale();

  return (
    <View className="mx-auto w-full max-w-md items-center justify-center pt-4">
      <View className="mb-4">
        <Text className="opacity-60 dark:text-white" style={{ fontSize: Math.round(18 * scale) }}>
          {index + 1} / {total}
        </Text>
      </View>

      <Pressable
        className="aspect-[0.95] w-full items-center justify-center rounded-[32px] bg-orange-50 shadow-lg shadow-black/10 dark:bg-orange-900"
        onPress={() => speak(main, targetLanguage)}>
        <MotionVisual
          key={word.id}
          emoji={word.emoji}
          motion={word.motion}
          media={word.media}
          size={Math.round(130 * scale)}
        />
        <Text
          className="text-center font-extrabold text-slate-700 dark:text-orange-100"
          style={{ fontSize: Math.round(44 * scale) }}>
          {main}
        </Text>
        <Text
          className="mt-1.5 text-slate-400 dark:text-orange-300"
          style={{ fontSize: Math.round(24 * scale) }}>
          {translation}
        </Text>
      </Pressable>

      <View className="mt-6 flex-row gap-3 bg-transparent">
        <Pressable
          className="flex-1 items-center rounded-full px-3 py-3"
          style={{ backgroundColor: '#ED6A5A' }}
          onPress={() => speak(word.fr, 'fr')}>
          <Text className="text-lg font-bold text-white" numberOfLines={1}>
            {LANGUAGE_META.fr.flag} {word.fr}
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-full px-3 py-3"
          style={{ backgroundColor: '#3A86FF' }}
          onPress={() => speak(word.en, 'en')}>
          <Text className="text-lg font-bold text-white" numberOfLines={1}>
            {LANGUAGE_META.en.flag} {word.en}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
