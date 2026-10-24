import {
  AdminCohort,
  AdminScenarioVersion,
  AuditLogEntry,
  CapabilityItem,
  CohortMember,
  CohortProgress,
  FeedbackReport,
  ScenarioDetail,
  ScenarioListItem,
  SimulationSession,
  Track,
  TraineeProgress,
  UsageSummary,
  User,
} from '../types';

import { getDeviceFingerprint } from '../utils/fingerprint';

const API_BASE = '/api';

// Configurable Multi-Cloud Backend Fallback Pool
export const BACKEND_FALLBACK_URLS: string[] = [
  API_BASE,
  ((import.meta as any).env?.VITE_HF_BACKEND_URL || '').replace(/\/+$/, ''),
  ((import.meta as any).env?.VITE_KOYEB_BACKEND_URL || '').replace(/\/+$/, ''),
  ((import.meta as any).env?.VITE_ORACLE_BACKEND_URL || '').replace(/\/+$/, ''),
  'https://scenariolab-api.onrender.com/api',
].filter(Boolean);

function resolveUrl(endpoint: string, attempt: number): string {
  const base = attempt === 0 ? API_BASE : (BACKEND_FALLBACK_URLS[attempt % BACKEND_FALLBACK_URLS.length] || API_BASE);
  return `${base}${endpoint}`;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let fp = '';
  try {
    fp = await getDeviceFingerprint();
  } catch {
    // fallback
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(fp ? { 'X-Device-Fingerprint': fp } : {}),
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  let response: Response | null = null;
  const maxRetries = 3;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const targetUrl = resolveUrl(endpoint, attempt);
      response = await fetch(targetUrl, {
        ...options,
        headers: {
          ...headers,
          ...getAuthHeader(),
        },
      });

      // Break if successful or not a transient gateway/proxy error
      const isTransient = [502, 503, 504].includes(response.status) || (response.status === 401 && !endpoint.includes('/auth/login'));
      if (response.ok || !isTransient || attempt === maxRetries) {
        break;
      }
    } catch (netErr) {
      lastError = netErr;
      if (attempt === maxRetries) throw netErr;
    }

    // Exponential backoff: 600ms, 1200ms, 2000ms
    const delay = 600 * Math.pow(1.8, attempt) + Math.random() * 300;
    await new Promise((r) => setTimeout(r, delay));
  }

  if (!response) {
    throw lastError || new Error('Network request failed');
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('scenariolab_active_session_id');
    }
    let errorMsg = `Request failed (${response.status})`;
    let errorCode = 'UNKNOWN';
    try {
      const errJson = await response.json();
      if (errJson.error) {
        errorMsg = errJson.error.message || errorMsg;
        errorCode = errJson.error.code || errorCode;
      } else if (errJson.detail) {
        errorMsg = errJson.detail;
      }
    } catch {
      // JSON parse failed, use fallback message
    }
    throw new ApiError(errorMsg, response.status, errorCode);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(passcode: string, displayName: string): Promise<{ access_token: string; user: User }> {
    const data = await request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ passcode, display_name: displayName }),
    });
    localStorage.setItem('auth_token', data.access_token);
    return data;
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
    }
  },

  // In-Memory Cache for fast, zero-delay navigation between tracks & scenarios
  _cache: new Map<string, { data: unknown; timestamp: number }>(),

  clearCache(): void {
    api._cache.clear();
  },

  // Tracks & Scenarios
  async getTracks(): Promise<Track[]> {
    const cached = api._cache.get('tracks');
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data as Track[];
    }
    const data = await request<Track[]>('/tracks');
    api._cache.set('tracks', { data, timestamp: Date.now() });
    return data;
  },

  async getScenarios(params?: { track?: string; topic?: string; difficulty?: number }): Promise<ScenarioListItem[]> {
    const cacheKey = `scenarios_${params?.track || 'all'}_${params?.topic || 'all'}_${params?.difficulty || 'all'}`;
    const cached = api._cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data as ScenarioListItem[];
    }
    const query = new URLSearchParams();
    if (params?.track) query.append('track', params.track);
    if (params?.topic) query.append('topic', params.topic);
    if (params?.difficulty) query.append('difficulty', String(params.difficulty));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await request<ScenarioListItem[]>(`/scenarios${qs}`);
    api._cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getScenarioDetail(id: string): Promise<ScenarioDetail> {
    const cacheKey = `scenario_${id}`;
    const cached = api._cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data as ScenarioDetail;
    }
    const data = await request<ScenarioDetail>(`/scenarios/${id}`);
    api._cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  async getCapabilities(): Promise<CapabilityItem[]> {
    const cacheKey = 'capabilities_60';
    const cached = api._cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data as CapabilityItem[];
    }
    const data = await request<CapabilityItem[]>('/capabilities');
    api._cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  // Sessions
  async createSession(scenarioId: string, mode: 'text' | 'voice' = 'text'): Promise<SimulationSession> {
    const fp = await getDeviceFingerprint();
    return request<SimulationSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenarioId, mode, device_fingerprint: fp }),
    });
  },

  async getSessionDetail(sessionId: string): Promise<SimulationSession> {
    return request<SimulationSession>(`/sessions/${sessionId}`);
  },

  async endSession(sessionId: string): Promise<SimulationSession> {
    return request<SimulationSession>(`/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  },

  async listMySessions(): Promise<SimulationSession[]> {
    return request<SimulationSession[]>('/sessions?mine=true');
  },

  async listCohortSessions(): Promise<SimulationSession[]> {
    return request<SimulationSession[]>('/sessions?mine=false');
  },

  // Evaluation
  async getSessionEvaluation(sessionId: string): Promise<FeedbackReport> {
    return request<FeedbackReport>(`/sessions/${sessionId}/evaluation`);
  },

  async regenerateSessionEvaluation(sessionId: string): Promise<FeedbackReport> {
    return request<FeedbackReport>(`/sessions/${sessionId}/evaluation`, {
      method: 'POST',
    });
  },

  // Progress & Analytics
  async getMyProgress(): Promise<TraineeProgress> {
    return request<TraineeProgress>('/progress/me');
  },

  async getCohortProgress(cohortId: string): Promise<CohortProgress> {
    return request<CohortProgress>(`/admin/cohorts/${cohortId}/progress`);
  },

  async exportCohortCsv(cohortId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/admin/cohorts/${cohortId}/export.csv`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    if (!response.ok) {
      throw new ApiError('Failed to export CSV', response.status);
    }
    return response.blob();
  },

  // Admin Cohorts
  async listAdminCohorts(): Promise<AdminCohort[]> {
    return request<AdminCohort[]>('/admin/cohorts');
  },

  async createCohort(payload: {
    name: string;
    description?: string;
    duration_days?: number;
    track_access?: string;
    max_members?: number;
    budget_cap_usd?: number;
    custom_passcode?: string;
  }): Promise<AdminCohort> {
    return request<AdminCohort>('/admin/cohorts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteCohort(cohortId: string): Promise<void> {
    await request(`/admin/cohorts/${cohortId}`, {
      method: 'DELETE',
    });
  },

  async rotateCohortPasscode(
    cohortId: string,
    gracePeriodMinutes: number = 0
  ): Promise<{
    cohort_id: string;
    new_passcode: string;
    previous_passcode_valid_until?: string;
  }> {
    return request(`/admin/cohorts/${cohortId}/passcodes/rotate`, {
      method: 'POST',
      body: JSON.stringify({ grace_period_minutes: gracePeriodMinutes }),
    });
  },

  async extendCohort(cohortId: string, days: number): Promise<AdminCohort> {
    return request<AdminCohort>(`/admin/cohorts/${cohortId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ additional_days: days }),
    });
  },

  async revokeCohortSessions(cohortId: string): Promise<{ message: string }> {
    return request(`/admin/cohorts/${cohortId}/revoke-sessions`, {
      method: 'POST',
    });
  },

  async listCohortMembers(cohortId: string): Promise<CohortMember[]> {
    return request<CohortMember[]>(`/admin/cohorts/${cohortId}/members`);
  },

  async addCohortMember(cohortId: string, displayName: string, role: string = 'trainee'): Promise<CohortMember> {
    return request<CohortMember>(`/admin/cohorts/${cohortId}/members`, {
      method: 'POST',
      body: JSON.stringify({ display_name: displayName, role }),
    });
  },

  async bulkAddCohortMembers(cohortId: string, names: string[], role: string = 'trainee'): Promise<CohortMember[]> {
    return request<CohortMember[]>(`/admin/cohorts/${cohortId}/members/bulk`, {
      method: 'POST',
      body: JSON.stringify({ names, role }),
    });
  },

  async removeCohortMember(cohortId: string, userId: string): Promise<void> {
    await request(`/admin/cohorts/${cohortId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async resetCohortMemberAttempts(cohortId: string, userId: string): Promise<{ message: string }> {
    return request(`/admin/cohorts/${cohortId}/members/${userId}/reset-attempts`, {
      method: 'POST',
    });
  },

  // Admin Scenarios Studio
  async listAdminScenarios(): Promise<Record<string, unknown>[]> {
    return request<Record<string, unknown>[]>('/admin/scenarios');
  },

  async getAdminScenarioDetail(id: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(`/admin/scenarios/${id}`);
  },

  async publishScenario(id: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(`/admin/scenarios/${id}/publish`, { method: 'POST' });
  },

  async archiveScenario(id: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(`/admin/scenarios/${id}/archive`, { method: 'POST' });
  },

  async duplicateScenario(id: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(`/admin/scenarios/${id}/duplicate`, { method: 'POST' });
  },

  async deleteScenario(id: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(`/admin/scenarios/${id}`, { method: 'DELETE' });
  },

  async validateScenarioYaml(
    yamlContent: string
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[]; scenario_preview?: Record<string, unknown> }> {
    const res = await fetch(`${API_BASE}/admin/scenarios/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...getAuthHeader(),
      },
      body: yamlContent,
    });
    return res.json();
  },

  async importScenarioYaml(yamlContent: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/admin/scenarios/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...getAuthHeader(),
      },
      body: yamlContent,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.detail || 'Import failed', res.status);
    }
    return res.json();
  },

  async generateAiScenarioDraft(payload: {
    prompt: string;
    track_key?: string;
    difficulty?: number;
  }): Promise<Record<string, unknown>> {
    return request('/admin/scenarios/ai-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getScenarioVersions(id: string): Promise<AdminScenarioVersion[]> {
    return request<AdminScenarioVersion[]>(`/admin/scenarios/${id}/versions`);
  },

  async restoreScenarioVersion(id: string, version: number): Promise<Record<string, unknown>> {
    return request(`/admin/scenarios/${id}/versions/${version}/restore`, {
      method: 'POST',
    });
  },

  // Admin Analytics & Observability
  async getAdminAuditLogs(
    action?: string,
    limit: number = 50
  ): Promise<{ items: AuditLogEntry[]; total: number }> {
    const qs = action
      ? `?action=${encodeURIComponent(action)}&limit=${limit}`
      : `?limit=${limit}`;
    return request(`/admin/audit-logs${qs}`);
  },

  async getAdminUsage(): Promise<UsageSummary> {
    return request<UsageSummary>('/admin/usage');
  },

  // Streaming message exchange via SSE
  async sendSessionMessageStream(
    sessionId: string,
    content: string,
    onChunk: (chunk: string) => void,
    onDone: (status?: string, endReason?: string, latencyMs?: number) => void,
    onError: (err: Error) => void
  ): Promise<void> {
    const t0 = performance.now();
    let measuredLatencyMs = 0;
    try {
      let response: Response | null = null;
      for (let attempt = 0; attempt <= 2; attempt++) {
        const streamUrl = resolveUrl(`/sessions/${sessionId}/messages`, attempt);
        response = await fetch(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...getAuthHeader(),
          },
          body: JSON.stringify({ content }),
        });

        if (response.ok || ![502, 503, 504].includes(response.status) || attempt === 2) {
          break;
        }
        await new Promise((r) => setTimeout(r, 600 * Math.pow(1.5, attempt)));
      }

      if (!response || !response.ok) {
        throw new Error(`Message delivery failed (${response?.status || 'Unknown'})`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6).trim();
          if (payload === '[DONE]') {
            if (!measuredLatencyMs) measuredLatencyMs = Math.round(performance.now() - t0);
            onDone(undefined, undefined, measuredLatencyMs);
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'timing') {
              measuredLatencyMs = parsed.latency_ms || Math.round(performance.now() - t0);
            } else if (parsed.chunk) {
              onChunk(parsed.chunk);
            }
          } catch {
            // raw text chunk fallback
            onChunk(payload);
          }
        }
      }
      if (!measuredLatencyMs) measuredLatencyMs = Math.round(performance.now() - t0);
      onDone(undefined, undefined, measuredLatencyMs);
    } catch (err: unknown) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  },
};
