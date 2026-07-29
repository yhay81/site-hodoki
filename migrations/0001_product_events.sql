CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (
    name IN ('visited', 'inspected', 'export_saved', 'returned')
  ),
  context TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (session_id, name, context, occurred_on)
);

CREATE INDEX product_events_created_at ON product_events (created_at);
