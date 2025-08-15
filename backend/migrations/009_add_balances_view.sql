-- Create a view to compute neighbor balances (total charges - total payments)
CREATE OR REPLACE VIEW neighbor_balances AS
SELECT
  n.user_id,
  COALESCE(c.total_charges, 0)::numeric(12,2) AS total_charges,
  COALESCE(p.total_payments, 0)::numeric(12,2) AS total_payments,
  (COALESCE(c.total_charges, 0) - COALESCE(p.total_payments, 0))::numeric(12,2) AS balance
FROM neighbors n
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total_charges
  FROM charges
  GROUP BY user_id
) c ON c.user_id = n.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total_payments
  FROM payments
  GROUP BY user_id
) p ON p.user_id = n.user_id;
