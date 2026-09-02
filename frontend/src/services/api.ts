/// <reference types="vite/client" />

/**
 * API Service
 * Handles all HTTP requests to the backend
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshQueue: Array<{
    resolve: (value?: any) => void;
    reject: (err?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests if available
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle 401 -> refresh token with single-flight
    this.client.interceptors.response.use(
      (resp) => resp,
      async (error) => {
        const originalRequest = error.config || {};
        const isAuthRoute =
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/forgot-password') ||
          originalRequest.url?.includes('/auth/reset-password');
        if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthRoute) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.refreshQueue.push({ resolve, reject });
            }).then(() => {
              originalRequest._retry = true;
              originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
              return this.client.request(originalRequest);
            });
          }

          this.isRefreshing = true;
          originalRequest._retry = true;

          try {
            const refreshResp = await this.refreshToken();
            const refreshed = refreshResp?.data?.data;
            const newToken = refreshed?.accessToken;
            if (newToken) {
              localStorage.setItem('token', newToken);
              if (refreshed?.refreshToken) {
                localStorage.setItem('refreshToken', refreshed.refreshToken);
              }
            }
            this.refreshQueue.forEach((q) => q.resolve(newToken));
            this.refreshQueue = [];
            this.isRefreshing = false;
            originalRequest.headers.Authorization = `Bearer ${newToken || localStorage.getItem('token')}`;
            return this.client.request(originalRequest);
          } catch (rErr) {
            this.refreshQueue.forEach((q) => q.reject(rErr));
            this.refreshQueue = [];
            this.isRefreshing = false;
            throw rErr;
          }
        }
        throw error;
      }
    );
  }

  // Simple refresh implementation - expects a refresh token in localStorage
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token available');
    // Use a bare axios instance to avoid interceptor loops
    const bare = axios.create({ baseURL: API_BASE_URL });
    return bare.post('/auth/refresh', { refreshToken });
  }

  // Builds
  createBuild(data: any) {
    return this.client.post('/builds', data);
  }

  getBuild(buildId: string) {
    return this.client.get(`/builds/${buildId}`);
  }

  listBuilds(
    params?: { limit?: number; offset?: number; page?: number; projectId?: string; search?: string; status?: string } | number,
    offset = 0
  ) {
    const queryParams = typeof params === 'number' ? { limit: params, offset } : params;
    return this.client.get('/builds', { params: queryParams });
  }

  updateBuild(buildId: string, data: any) {
    return this.client.patch(`/builds/${buildId}`, data);
  }

  getBuildMetrics(buildId: string) {
    return this.client.get(`/builds/${buildId}/metrics`);
  }

  compareBuilds(baseBuildId: string, targetBuildId: string) {
    return this.client.get('/builds/compare', {
      params: { baseBuildId, targetBuildId },
    });
  }

  // Tests
  ingestTestResults(buildId: string, results: any) {
    return this.client.post('/tests/ingest', { buildId, results });
  }

  getTestDetails(testRunId: string) {
    return this.client.get(`/tests/details/${testRunId}`);
  }

  getBuildSummary(buildId: string) {
    return this.client.get(`/tests/build/${buildId}/summary`);
  }

  getFlakyTests(params?: { status?: string; severity?: string; search?: string; limit?: number; offset?: number; page?: number } | number) {
    const queryParams = typeof params === 'number' ? { limit: params } : params;
    return this.client.get('/flaky', { params: queryParams });
  }

  getFlakySummary() {
    return this.client.get('/flaky/summary');
  }

  runFlakyAnalysis() {
    return this.client.post('/flaky/analyze');
  }

  updateFlakyQuarantine(id: string, quarantineStatus: string, notes?: string) {
    return this.client.patch(`/flaky/${id}/quarantine`, { quarantineStatus, notes });
  }

  getFlakyHistory(id: string) {
    return this.client.get(`/flaky/${id}/history`);
  }

  getTestsByStatus(buildId: string, status: string, limit = 100) {
    return this.client.get('/tests/by-status', {
      params: { buildId, status, limit },
    });
  }

  updateTestStatus(
    testRunId: string,
    data: { status: string; quarantineReason?: string; resolvedAt?: string }
  ) {
    return this.client.patch(`/tests/${testRunId}/status`, data);
  }

  // Analytics
  getAnalyticsOverview(params?: { projectId?: string; timeRange?: string; environment?: string }) {
    return this.client.get('/analytics/overview', { params });
  }

  getAnalyticsTrends(params?: { projectId?: string; timeRange?: string; environment?: string }) {
    return this.client.get('/analytics/performance-trends', { params });
  }

  getSlowestTests(params?: { projectId?: string; timeRange?: string; environment?: string; limit?: number }) {
    return this.client.get('/analytics/slowest-tests', { params });
  }

  getFlakinessInsights(params?: { projectId?: string; timeRange?: string; environment?: string }) {
    return this.client.get('/analytics/flakiness-insights', { params });
  }

  getAnalyticsDistribution(params?: { projectId?: string; timeRange?: string; environment?: string }) {
    return this.client.get('/analytics/distribution', { params });
  }

  getSpecHealth(params?: { projectId?: string; timeRange?: string; environment?: string; search?: string }) {
    return this.client.get('/analytics/spec-health', { params });
  }

  exportAnalyticsReport(params?: { projectId?: string; timeRange?: string; environment?: string; format?: 'json' | 'csv' }) {
    return this.client.get('/analytics/export', {
      params,
      responseType: params?.format === 'csv' ? 'blob' : 'json',
    });
  }

  // Auth
  register(data: { email: string; username: string; password: string }) {
    return this.client.post('/auth/register', data);
  }

  login(identifier: string, password: string) {
    const isEmail = identifier.includes('@');
    return this.client.post('/auth/login', {
      ...(isEmail ? { email: identifier } : { username: identifier }),
      password,
    });
  }

  logout(refreshToken: string) {
    return this.client.post('/auth/logout', { refreshToken });
  }

  getProfile() {
    return this.client.get('/auth/me');
  }

  updateProfile(data: { firstName?: string; lastName?: string; avatarUrl?: string; notificationPreferences?: any }) {
    return this.client.patch('/auth/profile', data);
  }

  changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.client.post('/auth/change-password', data);
  }

  verifyEmail(token: string) {
    return this.client.post('/auth/verify-email', { token });
  }

  resendVerification(email: string) {
    return this.client.post('/auth/resend-verification', { email });
  }

  forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string) {
    return this.client.post('/auth/reset-password', { token, password });
  }

  listUsers(limit = 50, offset = 0) {
    return this.client.get('/auth/users', { params: { limit, offset } });
  }

  createUser(data: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: string;
  }) {
    return this.client.post('/auth/users', data);
  }

  getUser(id: string) {
    return this.client.get(`/auth/users/${id}`);
  }

  updateUser(id: string, data: { role?: string; is_active?: boolean }) {
    return this.client.patch(`/auth/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.client.delete(`/auth/users/${id}`);
  }

  // API Keys (user self-service)
  listApiKeys() {
    return this.client.get('/apikeys');
  }

  createApiKey(name: string) {
    return this.client.post('/apikeys', { name });
  }

  revokeApiKey(id: string) {
    return this.client.delete(`/apikeys/${id}`);
  }

  // Projects
  listProjects(params?: { limit?: number; offset?: number; page?: number; search?: string }) {
    return this.client.get('/projects', { params });
  }

  getProject(projectId: string) {
    return this.client.get(`/projects/${projectId}`);
  }

  createProject(data: { name: string; description?: string; slug?: string }) {
    return this.client.post('/projects', data);
  }

  updateProject(projectId: string, data: { name?: string; description?: string; status?: string }) {
    return this.client.patch(`/projects/${projectId}`, data);
  }

  deleteProject(projectId: string) {
    return this.client.delete(`/projects/${projectId}`);
  }

  getProjectBuilds(
    projectId: string,
    params?: { limit?: number; offset?: number; page?: number; search?: string; status?: string }
  ) {
    return this.client.get(`/projects/${projectId}/builds`, { params });
  }

  getProjectMembers(projectId: string) {
    return this.client.get(`/projects/${projectId}/members`);
  }

  addProjectMember(projectId: string, data: { email?: string; username?: string; userId?: string; role: string }) {
    return this.client.post(`/projects/${projectId}/members`, data);
  }

  updateProjectMemberRole(projectId: string, userId: string, role: string) {
    return this.client.patch(`/projects/${projectId}/members/${userId}`, { role });
  }

  removeProjectMember(projectId: string, userId: string) {
    return this.client.delete(`/projects/${projectId}/members/${userId}`);
  }

  getProjectInvitations(projectId: string) {
    return this.client.get(`/projects/${projectId}/invitations`);
  }

  cancelProjectInvitation(projectId: string, invitationId: string) {
    return this.client.delete(`/projects/${projectId}/invitations/${invitationId}`);
  }
}

export const apiService = new ApiService();

export default apiService;
