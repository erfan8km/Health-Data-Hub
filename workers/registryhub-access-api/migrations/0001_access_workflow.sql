PRAGMA foreign_keys = ON;

-- RegistryHub stores workflow metadata only. Individual-level health data remain
-- with the university/registry owner and must never be uploaded to this database.
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  tracking_code TEXT NOT NULL UNIQUE,
  registry_slug TEXT NOT NULL,
  applicant_name TEXT NOT NULL CHECK (length(trim(applicant_name)) BETWEEN 2 AND 160),
  applicant_email TEXT NOT NULL CHECK (length(trim(applicant_email)) BETWEEN 5 AND 254),
  institution_name TEXT NOT NULL CHECK (length(trim(institution_name)) BETWEEN 2 AND 200),
  department TEXT,
  country_code TEXT,
  research_title TEXT NOT NULL CHECK (length(trim(research_title)) BETWEEN 5 AND 300),
  research_purpose TEXT NOT NULL CHECK (length(trim(research_purpose)) BETWEEN 20 AND 5000),
  requested_data_description TEXT NOT NULL CHECK (length(trim(requested_data_description)) BETWEEN 5 AND 3000),
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN (
      'awaiting_payment',
      'payment_pending',
      'paid_pending_review',
      'under_admin_review',
      'submitted_to_university',
      'awaiting_university',
      'university_approved',
      'university_rejected',
      'data_delivered',
      'refund_pending',
      'refunded',
      'cancelled'
    )),
  terms_version TEXT NOT NULL,
  terms_accepted_at TEXT NOT NULL,
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status_created
  ON access_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_requests_email
  ON access_requests(applicant_email);
CREATE INDEX IF NOT EXISTS idx_access_requests_registry
  ON access_requests(registry_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS access_payments (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES access_requests(id),
  provider TEXT NOT NULL,
  amount_rial INTEGER NOT NULL CHECK (amount_rial > 0),
  currency TEXT NOT NULL DEFAULT 'IRR' CHECK (currency = 'IRR'),
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'verified', 'failed', 'cancelled', 'refund_pending', 'refunded')),
  authority TEXT UNIQUE,
  gateway_reference TEXT UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  initiated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT,
  failure_code TEXT,
  failure_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_payments_request
  ON access_payments(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_payments_status
  ON access_payments(status, created_at DESC);

CREATE TABLE IF NOT EXISTS access_universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_unit TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registry_university_routes (
  registry_slug TEXT NOT NULL,
  university_id TEXT NOT NULL REFERENCES access_universities(id),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (registry_slug, university_id)
);

CREATE TABLE IF NOT EXISTS access_request_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES access_requests(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'university')),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_request_events_request
  ON access_request_events(request_id, created_at);

CREATE TABLE IF NOT EXISTS university_correspondence (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES access_requests(id),
  university_id TEXT REFERENCES access_universities(id),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'manual')),
  subject TEXT,
  body TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (delivery_status IN ('draft', 'sent', 'received', 'failed')),
  external_message_id TEXT,
  created_by TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_university_correspondence_request
  ON university_correspondence(request_id, created_at);

CREATE TABLE IF NOT EXISTS access_email_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES access_requests(id),
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_email_logs_request
  ON access_email_logs(request_id, created_at);
