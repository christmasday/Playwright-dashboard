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
