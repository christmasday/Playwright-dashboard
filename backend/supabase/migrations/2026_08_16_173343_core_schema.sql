-- MIGRATION: Core schema
-- Migration ID: 2026_08_16_173343
-- Description: Core tables for Playwright Dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Builds table
CREATE TABLE IF NOT EXISTS builds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  branch VARCHAR(255),
  commit_hash VARCHAR(255),
  commit_message TEXT,
  environment VARCHAR(255),
  status VARCHAR(50) DEFAULT 'running',
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test runs table
CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  file VARCHAR(255),
  tags JSONB,
  status VARCHAR(50),
  retries INTEGER DEFAULT 0,
  duration INTEGER,
  flakiness_score NUMERIC(5,2),
  quarantined BOOLEAN DEFAULT FALSE,
  quarantine_reason TEXT,
  quarantine_expires_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  step_number INTEGER,
  step_title VARCHAR(255),
  status VARCHAR(50),
  duration INTEGER,
  error TEXT,
  error_location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  type VARCHAR(50),
  name VARCHAR(255),
  path VARCHAR(1024),
  url VARCHAR(1024),
  size BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flaky tests table
CREATE TABLE IF NOT EXISTS flaky_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name VARCHAR(255) NOT NULL,
  file VARCHAR(255),
  flakiness_score NUMERIC(5, 2),
  failure_count INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_name, file)
);

-- Metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  metric_type VARCHAR(50),
  metric_key VARCHAR(255),
  metric_value NUMERIC,
  recorded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actions table
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(50),
  test_name VARCHAR(255),
  file VARCHAR(255),
  rule JSONB,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(255),
  url VARCHAR(1024),
  headers JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  key_hash VARCHAR(255) UNIQUE,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conditional execution rules table
CREATE TABLE IF NOT EXISTS conditional_execution_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  condition TEXT NOT NULL,
  action VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_runs_build_id ON test_runs(build_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_run_id ON test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_test_run_id ON artifacts(test_run_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_build_id ON artifacts(build_id);
CREATE INDEX IF NOT EXISTS idx_metrics_build_id ON metrics(build_id);
CREATE INDEX IF NOT EXISTS idx_builds_created_at ON builds(created_at);
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON test_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_condition_rules_enabled ON conditional_execution_rules(enabled);

-- Insert initial migration record
INSERT INTO migrations (name) VALUES ('2026_08_16_173343_core_schema') ON CONFLICT (name) DO NOTHING;
