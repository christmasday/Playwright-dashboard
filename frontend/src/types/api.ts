/**
 * Core Types
 */

export interface BuildResponse {
  id: string;
  name: string;
  branch: string;
  commitHash: string;
  commitMessage: string;
  environment: string;
  status: 'running' | 'passed' | 'failed' | 'completed';
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface TestRunResponse {
  id: string;
  buildId: string;
  name: string;
  title: string;
  file: string;
  tags: string[];
  status: 'passed' | 'failed' | 'skipped' | 'flaky' | 'timeout';
  duration: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface TestStepResponse {
  id: string;
  testRunId: string;
  stepNumber: number;
  stepTitle: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
  errorLocation?: string;
}

export interface ArtifactResponse {
  id: string;
  testRunId: string;
  type: 'screenshot' | 'video' | 'trace' | 'log';
  name: string;
  path: string;
  url: string;
  size: number;
}

export interface BuildMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  passRate: number;
  failureRate: number;
  averageDuration: number;
  totalDuration: number;
}

export interface FlakyTest {
  id: string;
  testName: string;
  file: string;
  flakinessScore: number;
  failureCount: number;
  totalRuns: number;
  lastSeen: string;
}

export type UserRole = 'admin' | 'maintainer' | 'viewer' | 'editor';

export interface NotificationPreferences {
  emailAlerts: boolean;
  flakyAlerts: boolean;
  buildFailures: boolean;
  weeklyDigest: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  notificationPreferences?: NotificationPreferences | string;
  notification_preferences?: NotificationPreferences | string;
  aiSettings?: any;
  ai_settings?: any;
  role: UserRole;
  isActive?: boolean;
  is_active?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix?: string;
  key_prefix?: string;
  createdAt?: string;
  created_at?: string;
  lastUsed?: string | null;
  last_used?: string | null;
  revoked: boolean;
  expiresAt?: string | null;
  expires_at?: string | null;
}

export type ProjectStatus = 'active' | 'archived' | 'inactive';

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: UserRole;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  memberRole?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithMembers extends Project {
  members: ProjectMember[];
  buildCount?: number;
  testCount?: number;
}

export type AlertProvider = 'slack' | 'teams' | 'discord' | 'webhook';
export type AlertEventTrigger = 'all' | 'failures_only' | 'status_change';

export interface AlertDestination {
  id: string;
  project_id?: string | null;
  projectId?: string | null;
  project_name?: string | null;
  name: string;
  provider: AlertProvider;
  webhook_url: string;
  webhookUrl?: string;
  events: AlertEventTrigger;
  branches: string;
  include_ai_summary?: boolean;
  includeAiSummary?: boolean;
  enabled: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertDeliveryLog {
  id: string;
  alert_destination_id?: string;
  destination_name?: string;
  build_id?: string;
  build_name?: string;
  provider: AlertProvider;
  status: 'success' | 'failed';
  status_code?: number;
  latency_ms?: number;
  error_message?: string | null;
  payload?: any;
  created_at: string;
}

export type IntegrationProvider = 'jira' | 'github';

export interface GitHubConfig {
  owner: string;
  repo: string;
  token?: string;
  default_labels?: string[];
}

export interface JiraConfig {
  host_url: string;
  email: string;
  api_token?: string;
  project_key: string;
  issue_type?: string;
  default_priority?: string;
  default_labels?: string[];
}

export interface IntegrationConfigItem {
  id: string;
  project_id?: string | null;
  project_name?: string | null;
  provider: IntegrationProvider;
  config: GitHubConfig | JiraConfig | any;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface IssueLink {
  id: string;
  project_id?: string | null;
  test_run_id?: string | null;
  test_name: string;
  test_file?: string | null;
  provider: IntegrationProvider;
  issue_id: string;
  issue_key: string;
  issue_url: string;
  issue_title: string;
  issue_status: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIssuePayload {
  testRunId: string;
  provider: IntegrationProvider;
  title?: string;
  description?: string;
  priority?: string;
  issueType?: string;
  labels?: string[];
  includeAi?: boolean;
  includeError?: boolean;
}

export type StorageByosProvider = 's3' | 'gcs' | 'azure' | 'minio' | 'r2';

export interface ByosConfig {
  provider?: StorageByosProvider;
  bucket?: string;
  region?: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
  accessKey?: string;
  secretKey?: string;
}

export interface StoragePolicyItem {
  id?: string;
  project_id?: string | null;
  tier?: string;
  artifacts_passed_days: number | null;
  artifacts_failed_days: number | null;
  test_results_days: number | null;
  test_details_days: number | null;
  reports_analytics_days: number | null;
  byos_enabled: boolean;
  byos_provider: StorageByosProvider;
  byos_config: ByosConfig;
  auto_purge_enabled: boolean;
  last_cleanup_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StorageStats {
  totalArtifacts: number;
  totalBytes: number;
  breakdown: {
    screenshots: { count: number; bytes: number };
    videos: { count: number; bytes: number };
    traces: { count: number; bytes: number };
    other: { count: number; bytes: number };
  };
  counts: {
    builds: number;
    testRuns: number;
  };
  expiredCandidates: {
    passedArtifacts: number;
    failedArtifacts: number;
    testRuns: number;
    totalEligibleForCleanup: number;
  };
  lastCleanupAt: string | null;
}


