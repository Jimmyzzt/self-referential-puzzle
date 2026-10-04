CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS check_events (
  event_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  payload_hash TEXT NOT NULL,
  origin TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS puzzle_versions (
  puzzle_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  solution TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  PRIMARY KEY (puzzle_id, revision)
);
CREATE TABLE IF NOT EXISTS attempts (
  attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES check_events(event_id),
  player_id TEXT NOT NULL REFERENCES players(player_id),
  puzzle_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  UNIQUE (event_id, puzzle_id),
  FOREIGN KEY (puzzle_id, revision) REFERENCES puzzle_versions(puzzle_id, revision)
);
CREATE INDEX IF NOT EXISTS attempts_player_puzzle ON attempts(player_id, puzzle_id, revision, attempt_id);
CREATE INDEX IF NOT EXISTS attempts_puzzle ON attempts(puzzle_id, revision);

CREATE VIEW IF NOT EXISTS first_attempts AS
SELECT a.* FROM attempts a
WHERE a.attempt_id = (
  SELECT MIN(b.attempt_id) FROM attempts b
  WHERE b.player_id = a.player_id AND b.puzzle_id = a.puzzle_id AND b.revision = a.revision
);

CREATE VIEW IF NOT EXISTS first_puzzle_attempts AS
SELECT a.* FROM attempts a
WHERE a.attempt_id = (
  SELECT MIN(b.attempt_id) FROM attempts b
  WHERE b.player_id = a.player_id AND b.puzzle_id = a.puzzle_id
);

CREATE VIEW IF NOT EXISTS player_stats AS
SELECT player_id, COUNT(*) AS puzzles_attempted, SUM(correct) AS first_correct,
  ROUND(100.0 * AVG(correct), 1) AS first_accuracy_pct,
  CASE WHEN COUNT(*) < 8 THEN 'insufficient'
       WHEN AVG(correct) >= 0.8 THEN 'high_accuracy'
       WHEN AVG(correct) <= 0.5 THEN 'low_accuracy'
       ELSE 'middle' END AS cohort
FROM first_puzzle_attempts GROUP BY player_id;

CREATE VIEW IF NOT EXISTS cohort_attempts AS
SELECT target.*, COUNT(other.attempt_id) AS other_puzzles,
  AVG(other.correct) AS other_accuracy,
  CASE WHEN COUNT(other.attempt_id) < 8 THEN 'insufficient'
       WHEN AVG(other.correct) >= 0.8 THEN 'high_accuracy'
       WHEN AVG(other.correct) <= 0.5 THEN 'low_accuracy'
       ELSE 'middle' END AS cohort
FROM first_attempts target
LEFT JOIN first_puzzle_attempts other
  ON other.player_id = target.player_id AND other.puzzle_id != target.puzzle_id
GROUP BY target.attempt_id;

CREATE VIEW IF NOT EXISTS puzzle_cohort_stats AS
SELECT puzzle_id, revision, cohort, COUNT(*) AS players,
  SUM(correct) AS first_correct, ROUND(100.0 * AVG(correct), 1) AS first_accuracy_pct
FROM cohort_attempts GROUP BY puzzle_id, revision, cohort;

CREATE VIEW IF NOT EXISTS puzzle_stats AS
SELECT totals.*, firsts.first_correct, firsts.first_accuracy_pct
FROM (
  SELECT puzzle_id, revision, COUNT(*) AS submissions, COUNT(DISTINCT player_id) AS players,
    SUM(correct) AS correct_submissions, ROUND(100.0 * AVG(correct), 1) AS submission_accuracy_pct
  FROM attempts GROUP BY puzzle_id, revision
) totals
JOIN (
  SELECT puzzle_id, revision, SUM(correct) AS first_correct,
    ROUND(100.0 * AVG(correct), 1) AS first_accuracy_pct
  FROM first_attempts GROUP BY puzzle_id, revision
) firsts USING (puzzle_id, revision);
