ATTACH DATABASE ':memory:' AS silver;

CREATE TABLE silver.orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  segment_id INTEGER NOT NULL,
  net_amount REAL NOT NULL,
  loaded_at TEXT NOT NULL
);

INSERT INTO silver.orders VALUES
  ('O-001','C001',1,100.00,'2026-09-17T01:00:00'),
  ('O-002','C001',1, 50.00,'2026-09-17T01:01:00'),
  ('O-003','C002',2,200.00,'2026-09-17T01:02:00'),
  ('O-004','C003',2,-10.00,'2026-09-17T01:03:00'),
  ('O-005','CORPORATE_ACCOUNT_01',3,1000.00,'2026-09-17T01:04:00'),
  ('O-006','CORPORATE_ACCOUNT_01',3,1500.00,'2026-09-17T01:05:00'),
  ('O-007','CORPORATE_ACCOUNT_01',3,2000.00,'2026-09-17T01:06:00'),
  ('O-008','C002',2, 25.00,'2026-09-17T01:07:00'),
  ('O-009','C004',1,  0.00,'2026-09-17T01:08:00'),
  ('O-010','C005',2, 75.00,'2026-09-17T01:09:00'),
  ('O-011','C005',2, 25.00,'2026-09-17T01:10:00'),
  ('O-012','C006',4, 10.00,'2026-09-17T01:11:00');

CREATE TABLE silver.dim_customer_segment (
  segment_id INTEGER PRIMARY KEY,
  segment_name TEXT NOT NULL
);

INSERT INTO silver.dim_customer_segment VALUES
  (1,'Consumer'),
  (2,'Small Business'),
  (3,'Corporate'),
  (4,'Public Sector');
