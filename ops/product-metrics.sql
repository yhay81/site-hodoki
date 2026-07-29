SELECT
  COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_id END) AS users,
  COUNT(DISTINCT CASE WHEN name = 'inspected' THEN session_id END) AS inspectors,
  COUNT(CASE WHEN name = 'inspected' THEN 1 END) AS inspections,
  COUNT(DISTINCT CASE WHEN name = 'export_saved' THEN session_id END) AS exporters,
  COUNT(DISTINCT CASE WHEN name = 'export_saved' AND context = 'json' THEN session_id END)
    AS json_exporters,
  COUNT(DISTINCT CASE WHEN name = 'export_saved' AND context = 'html' THEN session_id END)
    AS html_exporters,
  COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_id END) AS returned,
  COUNT(DISTINCT CASE
    WHEN name = 'visited' AND occurred_on >= date('now', '-6 days') THEN session_id
  END) AS users_7d,
  COUNT(DISTINCT CASE
    WHEN name = 'inspected' AND occurred_on >= date('now', '-6 days') THEN session_id
  END) AS inspectors_7d
FROM product_events;
