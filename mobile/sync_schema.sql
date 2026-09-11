CREATE TABLE sync_queue (
  operation_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  payload TEXT NOT NULL,
  base_version INTEGER CHECK (base_version IS NULL OR base_version > 0),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','applied','conflict','failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX sync_queue_state_created_idx ON sync_queue(state, created_at);
