use std::{
    collections::HashMap,
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;

const VOCABULARY_PATH: &str = "data/vocabulary.json";
const PROGRESS_PATH: &str = "data/progress.json";

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Category {
    id: String,
    name_fr: String,
    name_en: String,
    color: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Media {
    kind: String,
    asset: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Word {
    id: String,
    category: String,
    emoji: String,
    fr: String,
    en: String,
    #[serde(default)]
    motion: Option<String>,
    #[serde(default)]
    media: Option<Media>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Vocabulary {
    categories: Vec<Category>,
    words: Vec<Word>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct ProgressEntry {
    player: String,
    word_id: String,
    language: String,
    correct: bool,
    timestamp: String,
}

#[derive(Debug, Deserialize)]
struct WordQuery {
    category: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QuizQuery {
    category: Option<String>,
    count: Option<usize>,
    language: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProgressRequest {
    player: String,
    word_id: String,
    language: String,
    correct: bool,
}

#[derive(Debug, Deserialize)]
struct ProgressQuery {
    player: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
struct QuizQuestion {
    word_id: String,
    emoji: String,
    prompt: String,
    options: Vec<String>,
    correct: usize,
    motion: Option<String>,
    media: Option<Media>,
}

#[derive(Serialize, Deserialize, Default, Clone)]
struct ProgressStore {
    entries: Vec<ProgressEntry>,
}

impl ProgressStore {
    fn load(path: &PathBuf) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    fn save(&self, path: &PathBuf) {
        if let Some(dir) = path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        if let Ok(raw) = serde_json::to_string_pretty(&self) {
            let _ = std::fs::write(path, raw);
        }
    }
}

#[derive(Clone)]
struct AppState {
    vocabulary: Arc<Vocabulary>,
    progress: Arc<Mutex<ProgressStore>>,
    progress_path: Arc<PathBuf>,
}

fn now_iso() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let days = secs / 86400;
    let (y, m, d) = {
        let z = days as i64 + 719468;
        let era = if z >= 0 { z } else { z - 146096 } / 146097;
        let doe = z - era * 146097;
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        let y = yoe + era * 400;
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        let mp = (5 * doy + 2) / 153;
        let d = doy - (153 * mp + 2) / 5 + 1;
        let m = if mp < 10 { mp + 3 } else { mp - 9 };
        (y, m, d)
    };
    let tod = secs % 86400;
    let (hh, mm, ss) = (tod / 3600, (tod % 3600) / 60, tod % 60);
    format!("{y:04}-{m:02}-{d:02}T{hh:02}:{mm:02}:{ss:02}Z")
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "service": "lingo-kids-backend" }))
}

async fn categories(State(state): State<AppState>) -> Json<Vec<serde_json::Value>> {
    let vocab = &state.vocabulary;
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for w in &vocab.words {
        *counts.entry(w.category.as_str()).or_insert(0) += 1;
    }
    let out: Vec<serde_json::Value> = vocab
        .categories
        .iter()
        .map(|c| {
            serde_json::json!({
                "id": c.id,
                "name_fr": c.name_fr,
                "name_en": c.name_en,
                "color": c.color,
                "word_count": counts.get(c.id.as_str()).copied().unwrap_or(0)
            })
        })
        .collect();
    Json(out)
}

async fn words(
    State(state): State<AppState>,
    Query(query): Query<WordQuery>,
) -> Json<Vec<Word>> {
    let vocab = &state.vocabulary;
    let filtered: Vec<Word> = match &query.category {
        Some(cat) => vocab.words.iter().filter(|w| &w.category == cat).cloned().collect(),
        None => vocab.words.clone(),
    };
    Json(filtered)
}

async fn word_by_id(State(state): State<AppState>, Path(id): Path<String>) -> Result<Json<Word>, StatusCode> {
    state
        .vocabulary
        .words
        .iter()
        .find(|w| w.id == id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

fn build_question(word: &Word, distractor_words: &[&Word], language: &str) -> QuizQuestion {
    let mut options: Vec<String> = std::iter::once(word)
        .chain(distractor_words.iter().copied())
        .map(|w| match language {
            "en" => w.en.clone(),
            _ => w.fr.clone(),
        })
        .collect();
    options.shuffle(&mut rand::thread_rng());
    let correct_word = match language {
        "en" => word.en.clone(),
        _ => word.fr.clone(),
    };
    let correct = options.iter().position(|o| *o == correct_word).unwrap_or(0);
    QuizQuestion {
        word_id: word.id.clone(),
        emoji: word.emoji.clone(),
        prompt: correct_word,
        options,
        correct,
        motion: word.motion.clone(),
        media: word.media.clone(),
    }
}

async fn quiz(
    State(state): State<AppState>,
    Query(query): Query<QuizQuery>,
) -> Json<Vec<QuizQuestion>> {
    let vocab = &state.vocabulary;
    let language = query.language.as_deref().unwrap_or("fr");
    let count = query.count.unwrap_or(5).clamp(2, 10);

    let pool: Vec<&Word> = match &query.category {
        Some(cat) => vocab.words.iter().filter(|w| &w.category == cat).collect(),
        None => vocab.words.iter().collect(),
    };

    let picked: Vec<&Word> = pool
        .choose_multiple(&mut rand::thread_rng(), count.min(pool.len()))
        .copied()
        .collect();

    let mut rng = rand::thread_rng();
    let questions: Vec<QuizQuestion> = picked
        .iter()
        .map(|w| {
            let mut distractors: Vec<&Word> = pool
                .iter()
                .filter(|d| d.id != w.id)
                .copied()
                .collect();
            distractors.shuffle(&mut rng);
            let d: Vec<&Word> = distractors.into_iter().take(3).collect();
            build_question(w, &d, language)
        })
        .collect();

    Json(questions)
}

async fn record_progress(
    State(state): State<AppState>,
    Json(body): Json<ProgressRequest>,
) -> Result<(StatusCode, Json<ProgressEntry>), StatusCode> {
    if state.vocabulary.words.iter().any(|w| w.id == body.word_id) {
        let entry = ProgressEntry {
            player: body.player,
            word_id: body.word_id,
            language: body.language,
            correct: body.correct,
            timestamp: now_iso(),
        };
        let mut store = state.progress.lock().unwrap();
        store.entries.push(entry.clone());
        store.save(&state.progress_path);
        Ok((StatusCode::CREATED, Json(entry)))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn progress(
    State(state): State<AppState>,
    Query(query): Query<ProgressQuery>,
) -> Json<serde_json::Value> {
    let store = state.progress.lock().unwrap();
    let entries = store.entries.clone();
    drop(store);

    let scoped: Vec<&ProgressEntry> = match &query.player {
        Some(p) => entries.iter().filter(|e| &e.player == p).collect(),
        None => entries.iter().collect(),
    };

    let total = scoped.len();
    let correct = scoped.iter().filter(|e| e.correct).count();

    let mut by_word: HashMap<&str, (usize, usize)> = HashMap::new();
    for e in &scoped {
        let (c, n) = by_word.entry(e.word_id.as_str()).or_insert((0, 0));
        if e.correct {
            *c += 1;
        }
        *n += 1;
    }
    let mastered: Vec<&Word> = state
        .vocabulary
        .words
        .iter()
        .filter(|w| by_word.get(w.id.as_str()).map_or(false, |(c, n)| *c >= 3 && *n >= 3))
        .collect();

    Json(serde_json::json!({
        "total_answers": total,
        "correct_answers": correct,
        "accuracy": if total == 0 { 0.0 } else { correct as f64 / total as f64 },
        "mastered_words": mastered.iter().map(|w| serde_json::json!({
            "id": w.id,
            "emoji": w.emoji,
            "fr": w.fr,
            "en": w.en,
        })).collect::<Vec<_>>(),
        "mastered_count": mastered.len(),
    }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let base = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let vocab_path = base.join(VOCABULARY_PATH);
    let progress_path = base.join(PROGRESS_PATH);

    let vocabulary: Vocabulary = std::fs::read_to_string(&vocab_path)
        .map_err(|e| {
            tracing::error!("cannot read {vocab_path:?}: {e}");
            e
        })
        .and_then(|raw| {
            serde_json::from_str(&raw).map_err(|e| {
                tracing::error!("cannot parse vocabulary json: {e}");
                std::io::Error::new(std::io::ErrorKind::InvalidData, e)
            })
        })
        .expect("failed to load vocabulary.json");

    let progress_store = ProgressStore::load(&progress_path);

    let state = AppState {
        vocabulary: Arc::new(vocabulary),
        progress: Arc::new(Mutex::new(progress_store)),
        progress_path: Arc::new(progress_path),
    };

    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/categories", get(categories))
        .route("/api/words", get(words))
        .route("/api/words/{id}", get(word_by_id))
        .route("/api/quiz", get(quiz))
        .route("/api/progress", post(record_progress).get(progress))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = SocketAddr::from(([0, 0, 0, 0], port.parse().expect("invalid PORT")));
    tracing::info!("listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
