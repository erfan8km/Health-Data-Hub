CREATE TABLE IF NOT EXISTS support_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_reports_status_created
  ON support_reports(status, created_at);
CREATE TABLE IF NOT EXISTS usage_limits (
  bucket_key TEXT NOT NULL,
  bucket_date TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (bucket_key, bucket_date)
);