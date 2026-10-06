export interface User {
  id: string;
  display_name: string;
  role: 'trainee' | 'group_admin' | 'super_admin';
  cohort_id?: string;
  is_active: boolean;
  last_login_at?: string;
}

export interface Track {
  key: string;
  name: string;
  description?: string;
}

export interface SkillAssessedPreview {
  skill: string;
  weight: number;
}

export interface PersonaPreview {
  name: string;
  role: string;
  communication_style: string;
}

export interface ScenarioListItem {
  id: string;
  slug: string;
  track: string;
  title: string;
  topic: string;
  difficulty: number;
  duration_limit_seconds: number;
  skills_assessed: SkillAssessedPreview[];
  tags: string[];
}

export interface ScenarioDetail extends ScenarioListItem {
  turn_limit: number;
  brief: string;
  persona: PersonaPreview;
  opening_line: string;
}

export interface SessionMessage {
  seq: number;
  role: 'trainee' | 'counterpart' | 'system';
  content: string;
  latency_ms?: number;
  created_at: string;
}

export interface SimulationSession {
  id: string;
  scenario_id: string;
  scenario_title: string;
  mode: 'text' | 'voice';
  status: 'active' | 'completed' | 'abandoned' | 'timed_out';
  started_at: string;
  ended_at?: string;
  end_reason?: string;
  token_usage: number;
  turn_count: number;
  messages: SessionMessage[];
}
