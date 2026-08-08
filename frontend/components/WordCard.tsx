import * as Speech from 'expo-speech';
import { Pressable, StyleSheet } from 'react-native';

import MotionVisual from '@/components/MotionVisual';
import { Text, View } from '@/components/Themed';
import type { Language, Word } from '@/lib/api';

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

  return (
    <View style={styles.wrapper}>
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {index + 1} / {total}
        </Text>
      </View>

      <Pressable style={styles.card} onPress={() => speak(main, targetLanguage)}>
        <MotionVisual
          key={word.id}
          emoji={word.emoji}
          motion={word.motion}
          media={word.media}
          size={130}
        />
        <Text style={styles.mainWord}>{main}</Text>
        <Text style={styles.translation}>{translation}</Text>
      </Pressable>

      <View style={styles.audioRow}>
        <Pressable
          style={[styles.audioButton, { backgroundColor: '#ED6A5A' }]}
          onPress={() => speak(word.fr, 'fr')}>
          <Text style={styles.audioButtonText}>
            {LANGUAGE_META.fr.flag} {word.fr}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.audioButton, { backgroundColor: '#3A86FF' }]}
          onPress={() => speak(word.en, 'en')}>
          <Text style={styles.audioButtonText}>
            {LANGUAGE_META.en.flag} {word.en}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  counter: {
    marginBottom: 16,
  },
  counterText: {
    fontSize: 18,
    opacity: 0.6,
  },
  card: {
    width: '100%',
    aspectRatio: 0.95,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  mainWord: {
    fontSize: 44,
    fontWeight: '800',
    color: '#37474F',
    textAlign: 'center',
  },
  translation: {
    fontSize: 24,
    color: '#90A4AE',
    marginTop: 6,
  },
  audioRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    backgroundColor: 'transparent',
  },
  audioButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 130,
    alignItems: 'center',
  },
  audioButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
