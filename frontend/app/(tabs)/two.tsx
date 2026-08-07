import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import MotionVisual from '@/components/MotionVisual';
import { speak } from '@/components/WordCard';
import { Text, View } from '@/components/Themed';
import { useSettings } from '@/lib/settings';
import { fetchQuiz, recordProgress, type QuizQuestion } from '@/lib/api';

type AnswerState = { picked: number | null; correct: boolean };

export default function GamesScreen() {
  const { apiUrl, targetLanguage, playerName } = useSettings();
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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.primaryButton} onPress={loadQuiz}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    const total = questions.length;
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>
          {score === total ? 'Bravo, parfait !' : score >= total / 2 ? 'Bien joué !' : 'Encore un essai ?'}
        </Text>
        <Text style={styles.doneScore}>
          {score} / {total}
        </Text>
        <Pressable style={styles.primaryButton} onPress={loadQuiz}>
          <Text style={styles.primaryButtonText}>Rejouer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        Question {current + 1} / {questions.length}
      </Text>

      <View style={styles.questionCard}>
        <MotionVisual
          key={question.word_id}
          emoji={question.emoji}
          motion={question.motion}
          media={question.media}
          size={100}
        />
        <Text style={styles.prompt}>
          {targetLanguage === 'fr' ? 'C’est quoi ?' : 'What is it?'}
        </Text>
        <Pressable onPress={() => speak(question.options[question.correct], targetLanguage)}>
          <Text style={styles.hint}>🔊</Text>
        </Pressable>
      </View>

      <View style={styles.options}>
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
              style={[styles.option, { backgroundColor: bg }]}
              disabled={!!answer}
              onPress={() => handlePick(i)}>
              <Text style={styles.optionText}>{option}</Text>
              {answer && isCorrectOption && <Text style={styles.feedback}>✓</Text>}
              {answer && isPicked && !isCorrectOption && <Text style={styles.feedback}>✗</Text>}
            </Pressable>
          );
        })}
      </View>

      {answer && (
        <Pressable style={styles.primaryButton} onPress={next}>
          <Text style={styles.primaryButtonText}>
            {current + 1 >= questions.length ? 'Voir le score' : 'Question suivante'}
          </Text>
        </Pressable>
      )}
    </View>
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
  progress: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  questionCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 28,
    alignItems: 'center',
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  prompt: {
    fontSize: 28,
    fontWeight: '800',
    color: '#37474F',
    marginTop: 8,
  },
  hint: {
    fontSize: 28,
    marginTop: 4,
  },
  options: {
    gap: 12,
    marginTop: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#37474F',
  },
  feedback: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#3A86FF',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  doneEmoji: {
    fontSize: 80,
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 12,
  },
  doneScore: {
    fontSize: 40,
    fontWeight: '900',
    marginVertical: 12,
  },
});
