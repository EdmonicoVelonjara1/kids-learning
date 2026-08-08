import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import MotionVisual from '@/components/MotionVisual';
import { speak } from '@/components/WordCard';
import { useSettings } from '@/lib/settings';
import { useScale } from '@/lib/responsive';
import { fetchQuiz, recordProgress, type QuizQuestion } from '@/lib/api';

type AnswerState = { picked: number | null; correct: boolean };

export default function GamesScreen() {
  const { apiUrl, targetLanguage, playerName } = useSettings();
  const scale = useScale();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScore(0);
    setAnswer(null);
    setCurrent(0);
    try {
      setQuestions(await fetchQuiz(apiUrl, targetLanguage, null, 5));
    } catch {
      setError('Impossible de charger le jeu. Vérifie l’adresse dans Réglages.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, targetLanguage]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  useEffect(() => {
    if (questions.length > 0 && current < questions.length) {
      speak(questions[current].options[questions[current].correct], targetLanguage);
    }
  }, [questions, current, targetLanguage]);

  const question = questions[current];
  const finished = !!questions.length && current >= questions.length;

  const handlePick = useCallback(
    async (picked: number) => {
      if (!question || answer) return;
      const correct = picked === question.correct;
      setAnswer({ picked, correct });
      if (correct) setScore((s) => s + 1);
      const word = question.options[question.correct];
      speak(word, targetLanguage);
      recordProgress(apiUrl, playerName, question.word_id, targetLanguage, correct).catch(() => {});
    },
    [question, answer, apiUrl, playerName, targetLanguage]
  );

  const next = useCallback(() => {
    setAnswer(null);
    setCurrent((c) => c + 1);
  }, []);

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
        <Pressable className="rounded-full bg-blue-500 py-4" onPress={loadQuiz}>
          <Text className="text-lg font-extrabold text-white">Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    const total = questions.length;
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text style={{ fontSize: Math.round(80 * scale) }}>🎉</Text>
        <Text className="mt-3 font-extrabold dark:text-white" style={{ fontSize: Math.round(26 * scale) }}>
          {score === total ? 'Bravo, parfait !' : score >= total / 2 ? 'Bien joué !' : 'Encore un essai ?'}
        </Text>
        <Text className="my-3 font-black dark:text-white" style={{ fontSize: Math.round(40 * scale) }}>
          {score} / {total}
        </Text>
        <Pressable className="mt-6 rounded-full bg-blue-500 py-4" onPress={loadQuiz}>
          <Text className="text-lg font-extrabold text-white">Rejouer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="p-5">
      <View className="mx-auto w-full max-w-md">
        <Text className="mb-3 text-center text-base opacity-60 dark:text-white">
          Question {current + 1} / {questions.length}
        </Text>

        <View className="items-center rounded-3xl bg-orange-50 py-7 shadow-lg shadow-black/10 dark:bg-orange-900">
          <MotionVisual
            key={question.word_id}
            emoji={question.emoji}
            motion={question.motion}
            media={question.media}
            size={Math.round(100 * scale)}
          />
          <Text
            className="mt-2 font-extrabold text-slate-700 dark:text-orange-100"
            style={{ fontSize: Math.round(28 * scale) }}>
            {targetLanguage === 'fr' ? 'C’est quoi ?' : 'What is it?'}
          </Text>
          <Pressable onPress={() => speak(question.options[question.correct], targetLanguage)}>
            <Text className="mt-1" style={{ fontSize: Math.round(28 * scale) }}>
              🔊
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 gap-3">
          {question.options.map((option, i) => {
            const isCorrectOption = i === question.correct;
            const isPicked = answer?.picked === i;
            let bg = '#ECEFF1';
            if (answer) {
              if (isCorrectOption) bg = '#66BB6A';
              else if (isPicked) bg = '#EF5350';
            }
            return (
              <Pressable
                key={`${question.word_id}-${i}`}
                className="flex-row items-center justify-between rounded-[20px] px-5 py-[18px]"
                style={{ backgroundColor: bg }}
                disabled={!!answer}
                onPress={() => handlePick(i)}>
                <Text className="font-bold text-slate-700" style={{ fontSize: Math.round(22 * scale) }}>
                  {option}
                </Text>
                {answer && isCorrectOption && (
                  <Text className="font-black text-white" style={{ fontSize: Math.round(22 * scale) }}>
                    ✓
                  </Text>
                )}
                {answer && isPicked && !isCorrectOption && (
                  <Text className="font-black text-white" style={{ fontSize: Math.round(22 * scale) }}>
                    ✗
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {answer && (
          <Pressable className="mt-6 items-center rounded-full bg-blue-500 py-4" onPress={next}>
            <Text className="text-lg font-extrabold text-white">
              {current + 1 >= questions.length ? 'Voir le score' : 'Question suivante'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
