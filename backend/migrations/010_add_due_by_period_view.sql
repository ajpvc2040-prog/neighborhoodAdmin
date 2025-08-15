-- View to show per-user monthly due with latest neighborhood config amount
-- For each user and period in charges, show the configured amount and remaining due (config amount - proportional payments if needed later)
-- Initially, we treat charges.amount as the due amount created per period.
CREATE OR REPLACE VIEW neighbor_period_dues AS
SELECT
  c.user_id,
  c.period,
  c.amount::numeric(12,2) AS due_amount
FROM charges c;
