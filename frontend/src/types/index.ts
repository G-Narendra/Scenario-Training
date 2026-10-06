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

export interface SkillAverage {
  skill_key: string;
  skill_name: string;
  average_score: number;
  session_count: number;
}

export interface RecentSessionSummary {
  session_id: string;
  scenario_id: string;
  scenario_title: string;
  track_key: string;
  mode: string;
  status: string;
  score?: number;
  completed_at?: string;
  duration_seconds: number;
}

export interface RecommendedScenario {
  scenario_id: string;
  title: string;
  track_key: string;
  difficulty: number;
  topic: string;
  reason: string;
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
  scenario_title: string;
  session_id: string;
}

export interface TraineeProgress {
  total_sessions_completed: number;
  total_time_seconds: number;
  current_streak_days: number;
  overall_average_score: number;
  skill_averages: SkillAverage[];
  recent_sessions: RecentSessionSummary[];
  recommended_scenarios: RecommendedScenario[];
  score_trends: ScoreTrendPoint[];
}

export interface CohortMemberProgress {
  user_id: string;
  display_name: string;
  role: string;
  sessions_completed: number;
  average_score?: number;
  last_active_at?: string;
  top_skill?: string;
  needs_work_skill?: string;
}

export interface MostFailedScenario {
  scenario_id: string;
  title: string;
  track_key: string;
  difficulty: number;
  average_score: number;
  attempts_count: number;
  completion_rate: number;
}

export interface CohortProgress {
  cohort_id: string;
  cohort_name: string;
  total_members: number;
  active_members: number;
  total_sessions_completed: number;
  cohort_average_score: number;
  skill_score_distribution: SkillAverage[];
  most_failed_scenarios: MostFailedScenario[];
  members: CohortMemberProgress[];
}

