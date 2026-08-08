import AsyncStorage from '@react-native-async-storage/async-storage';

import vocabularyData from '@/lib/data/vocabulary.json';

export type Language = 'fr' | 'en';

export type MotionType =
  | 'bounce'
  | 'run'
  | 'clap'
  | 'dive'
  | 'swim'
  | 'walk'
  | 'dance'
  | 'throw'
  | 'climb'
  | 'sleep';

export type Media = {
  kind: 'video';
  asset: string;
};

export type Category = {
  id: string;
  name_fr: string;
  name_en: string;
  color: string;
  word_count: number;
};

export type Word = {
  id: string;
  category: string;
  emoji: string;
  fr: string;
  en: string;
  motion?: MotionType;
  media?: Media;
};

export type QuizQuestion = {
  word_id: string;
  emoji: string;
  prompt: string;
  options: string[];
  correct: number;
  motion?: MotionType;
  media?: Media;
};

export type MasteredWord = {
  id: string;
  emoji: string;
  fr: string;
  en: string;
};

export type ProgressSummary = {
  total_answers: number;
  correct_answers: number;
  accuracy: number;
  mastered_words: MasteredWord[];
  mastered_count: number;
};

type ProgressEntry = {
  player: string;
  word_id: string;
  language: string;
  correct: boolean;
  timestamp: string;
};

type VocabularyData = {
  categories: Omit<Category, 'word_count'>[];
  words: Word[];
};

const vocabulary = vocabularyData as VocabularyData;
const WORDS: Word[] = vocabulary.words;
const PROGRESS_KEY = 'lingo-kids/progress';

export function isApiConfigured(baseUrl: string | null | undefined): boolean {
  return !!baseUrl && baseUrl.trim().length > 0;
}

// ---------- remote (backend Rust) ----------

async function apiFetch<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------- local (offline) ----------

function localCategories(): Category[] {
  const counts = new Map<string, number>();
  for (const w of WORDS) {
    counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
  }
  return vocabulary.categories.map((c) => ({ ...c, word_count: counts.get(c.id) ?? 0 }));
}

function localWords(category: string | null): Word[] {
  return category ? WORDS.filter((w) => w.category === category) : WORDS;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function localQuiz(language: Language, category: string | null, count: number): QuizQuestion[] {
  const pool = localWords(category);
  const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
  return picked.map((word) => {
    const distractors = shuffle(pool.filter((d) => d.id !== word.id)).slice(0, 3);
    const options = shuffle([word, ...distractors].map((w) => w[language]));
    return {
      word_id: word.id,
      emoji: word.emoji,
      prompt: word[language],
      options,
      correct: options.indexOf(word[language]),
      motion: word.motion,
      media: word.media,
    };
  });
}

async function localLoadEntries(): Promise<ProgressEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressEntry[]) : [];
  } catch {
    return [];
  }
}

async function localSaveEntries(entries: ProgressEntry[]) {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(entries));
  } catch {
    // ignore persistence errors
  }
}

async function localRecordProgress(
  player: string,
  wordId: string,
  language: Language,
  correct: boolean
): Promise<void> {
  const entries = await localLoadEntries();
  entries.push({
    player,
    word_id: wordId,
    language,
    correct,
    timestamp: new Date().toISOString(),
  });
  await localSaveEntries(entries);
}

async function localProgress(player: string): Promise<ProgressSummary> {
  const entries = (await localLoadEntries()).filter((e) => e.player === player);
  const total = entries.length;
  const correct = entries.filter((e) => e.correct).length;

  const byWord = new Map<string, { correct: number; attempts: number }>();
  for (const e of entries) {
    const stat = byWord.get(e.word_id) ?? { correct: 0, attempts: 0 };
    if (e.correct) stat.correct += 1;
    stat.attempts += 1;
    byWord.set(e.word_id, stat);
  }

  const masteredWords: MasteredWord[] = WORDS.filter((w) => {
    const s = byWord.get(w.id);
    return !!s && s.correct >= 3 && s.attempts >= 3;
  }).map((w) => ({ id: w.id, emoji: w.emoji, fr: w.fr, en: w.en }));

  return {
    total_answers: total,
    correct_answers: correct,
    accuracy: total === 0 ? 0 : correct / total,
    mastered_words: masteredWords,
    mastered_count: masteredWords.length,
  };
}

// ---------- unified API (remote, fallback local) ----------

async function withFallback<T>(remote: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    return await remote();
  } catch {
    return await fallback();
  }
}

export async function fetchCategories(baseUrl: string | null | undefined): Promise<Category[]> {
  if (!isApiConfigured(baseUrl)) return localCategories();
  return withFallback(
    () => apiFetch<Category[]>(baseUrl!, '/api/categories'),
    () => localCategories()
  );
}

export async function fetchWords(
  baseUrl: string | null | undefined,
  category: string
): Promise<Word[]> {
  if (!isApiConfigured(baseUrl)) return localWords(category);
  return withFallback(
    () => apiFetch<Word[]>(baseUrl!, `/api/words?category=${encodeURIComponent(category)}`),
    () => localWords(category)
  );
}

export async function fetchQuiz(
  baseUrl: string | null | undefined,
  language: Language,
  category: string | null,
  count = 4
): Promise<QuizQuestion[]> {
  if (!isApiConfigured(baseUrl)) return localQuiz(language, category, count);
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  return withFallback(
    () => apiFetch<QuizQuestion[]>(baseUrl!, `/api/quiz?language=${language}&count=${count}${cat}`),
    () => localQuiz(language, category, count)
  );
}

export async function recordProgress(
  baseUrl: string | null | undefined,
  player: string,
  wordId: string,
  language: Language,
  correct: boolean
): Promise<void> {
  if (!isApiConfigured(baseUrl)) {
    await localRecordProgress(player, wordId, language, correct);
    return;
  }
  await withFallback(
    () =>
      apiFetch(baseUrl!, '/api/progress', {
        method: 'POST',
        body: JSON.stringify({ player, word_id: wordId, language, correct }),
      }),
    () => localRecordProgress(player, wordId, language, correct)
  );
}

export async function fetchProgress(
  baseUrl: string | null | undefined,
  player: string
): Promise<ProgressSummary> {
  if (!isApiConfigured(baseUrl)) return localProgress(player);
  return withFallback(
    () => apiFetch<ProgressSummary>(baseUrl!, `/api/progress?player=${encodeURIComponent(player)}`),
    () => localProgress(player)
  );
}
