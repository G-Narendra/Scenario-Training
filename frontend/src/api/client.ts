import {
  ScenarioDetail,
  ScenarioListItem,
  SimulationSession,
  Track,
  User,
} from '../types';

const API_BASE = '/api';

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
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
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

  // Tracks & Scenarios
  async getTracks(): Promise<Track[]> {
    return request<Track[]>('/tracks');
  },

  async getScenarios(params?: { track?: string; topic?: string; difficulty?: number }): Promise<ScenarioListItem[]> {
    const query = new URLSearchParams();
    if (params?.track) query.append('track', params.track);
    if (params?.topic) query.append('topic', params.topic);
    if (params?.difficulty) query.append('difficulty', String(params.difficulty));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ScenarioListItem[]>(`/scenarios${qs}`);
  },

  async getScenarioDetail(id: string): Promise<ScenarioDetail> {
    return request<ScenarioDetail>(`/scenarios/${id}`);
  },

  // Sessions
  async createSession(scenarioId: string, mode: 'text' | 'voice' = 'text'): Promise<SimulationSession> {
    return request<SimulationSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenarioId, mode }),
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

  // Streaming message exchange via SSE
  async sendSessionMessageStream(
    sessionId: string,
    content: string,
    onChunk: (chunk: string) => void,
    onDone: (status?: string, endReason?: string) => void,
    onError: (err: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Message delivery failed (${response.status})`);
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
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            }
          } catch {
            // raw text chunk fallback
            onChunk(payload);
          }
        }
      }
      onDone();
    } catch (err: any) {
      onError(err);
    }
  },
};
