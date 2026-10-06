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

export interface SkillScore {
  skill: string;
  score: number;
  rubric_level_reached: string;
  justification: string;
}

export interface WhatWorked {
  moment_seq: number;
  quote: string;
  why_it_worked: string;
}

export interface WhatDidnt {
  moment_seq: number;
  quote: string;
  why_it_missed: string;
}

export interface KeyMoment {
  moment_seq: number;
  quote: string;
  what_happened: string;
  why_it_matters: string;
  alternative_phrasing: string;
  reasoning: string;
}

export interface SuccessCriteriaResult {
  criterion: string;
  met: boolean;
  evidence: string;
}

export interface ImprovementStep {
  step: string;
  why: string;
  practice_drill: string;
  linked_skill: string;
}

export interface FeedbackReport {
  overall_summary: string;
  skill_scores: SkillScore[];
  what_worked: WhatWorked[];
  what_didnt: WhatDidnt[];
  key_moments: KeyMoment[];
  hidden_reveal: string;
  success_criteria_results: SuccessCriteriaResult[];
  improvement_steps: ImprovementStep[];
  overall_score: number;
  is_fallback?: boolean;
}
