-- MIGRATION: Row Level Security (RLS)
-- Migration ID: 2026_08_16_173410
-- Description: Enable RLS on public schema for security

-- Enable RLS on public schema (default for Supabase)
ALTER TABLE IF NOT EXISTS builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS flaky_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF NOT EXISTS conditional_execution_rules ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
GRANT SELECT ON builds TO authenticated, anon;
GRANT SELECT ON test_runs TO authenticated, anon;
GRANT SELECT ON test_results TO authenticated, anon;
GRANT SELECT ON artifacts TO authenticated, anon;
GRANT SELECT ON flaky_tests TO authenticated, anon;
GRANT SELECT ON metrics TO authenticated, anon;
GRANT SELECT ON actions TO authenticated, anon;
GRANT SELECT ON webhooks TO authenticated, anon;
GRANT SELECT ON api_keys TO authenticated;
GRANT SELECT ON conditional_execution_rules TO authenticated, anon;

-- Insert migration record
INSERT INTO migrations (name) VALUES ('2026_08_16_173410_rls') ON CONFLICT (name) DO NOTHING;
