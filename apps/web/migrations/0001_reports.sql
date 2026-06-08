CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  report_json TEXT NOT NULL,
  score_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_expires_at ON reports (expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_visitor_hash ON reports (visitor_hash);
