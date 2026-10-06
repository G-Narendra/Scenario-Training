# Master Task Checklist

## Phase 0: Foundations
- [x] 0.1 Initialize git, `.gitignore` with venv, node_modules, env, test outputs
- [x] 0.2 Create directory layout matching Section 6
- [x] 0.3 Create `.venv`, verify python interpreter inside `.venv`, upgrade pip
- [x] 0.4 Create `backend/requirements.txt` and `requirements-dev.txt` with pinned versions
- [x] 0.5 Create FastAPI skeleton with `/health`, `/version`, typed settings
- [x] 0.6 Create docker-compose for PostgreSQL, Alembic setup, initial migration
- [x] 0.7 Create Vite React TypeScript frontend skeleton with local dependencies
- [x] 0.8 Create setup, dev, and test scripts (bash + powershell) and Makefile
- [x] 0.9 Set up GitHub Actions CI workflow
- [x] 0.10 Create all core documentation files
- [x] 0.11 Write initial tests: health, settings, database connectivity
- [x] GATE 0: `make test` / run_tests passes; `/health` returns 200; frontend builds

## Phase 1: Access Control & Passcodes
- [x] 1.1 Implement cohorts, passcodes, users, auth_sessions models and migrations
- [x] 1.2 Cryptographic passcode generation and hashing
- [x] 1.3 Login by passcode + display name; JWT issuing with token hashes
- [x] 1.4 Hard 30-day cohort window enforcement
- [x] 1.5 Passcode rotation mechanism with grace periods and invalidation
- [x] 1.6 Passcode limits (max uses, session revocation, cohort revoke-all)
- [x] 1.7 Rate limiting and lockout on failed attempts
- [x] 1.8 Audit logging for auth events
- [x] 1.9 RBAC dependencies for trainee / group_admin / super_admin
- [x] 1.10 Comprehensive access control tests
- [x] GATE 1: All access tests green; manual cURL walkthrough documented

## Phase 2: Scenario Engine & Admin Content Management
- [x] 2.1 Scenario, skill, track, version models and migrations
- [x] 2.2 Strict Pydantic schema for scenario YAML format
- [x] 2.3 Import/export endpoints (YAML/JSON), bulk import, validation
- [x] 2.4 Scenario CRUD API for admins with version history
- [x] 2.5 Public trainee API with hidden-field protection
- [x] 2.6 Skill framework with rubrics (levels 1-5)
- [x] 2.7 Seed at least 12 scenarios (7 sales, 7 leadership)
- [x] 2.8 AI scenario draft endpoint for admin review
- [x] 2.9 Scenario validation and hidden-field leakage tests
- [x] GATE 2: Scenarios created, edited, published, listed without code changes

## Phase 3: AI Provider Layer & Conversation Engine
- [x] 3.1 LLMProvider interface with streaming, timeouts, retries, cost accounting
- [x] 3.2 Anthropic, OpenAI, and deterministic Mock adapters
- [x] 3.3 Persona prompt builder with guardrails and emotional realism
- [x] 3.4 Conversation engine with turn tracking, limits, streaming
- [x] 3.5 Curveball manager evaluating triggers each turn
- [x] 3.6 Conclusion detector for natural dialogue termination
- [x] 3.7 Injection defense guardrails and Fourth-wall enforcement
- [x] 3.8 Context management and history summarization
- [x] 3.9 Conversation engine tests with Mock provider
- [x] 3.10 Opt-in live provider tests
- [x] GATE 3: Scripted conversation completes to natural conclusion with Mock provider

## Phase 4: Text Chat Interface
- [x] 4.1 Session endpoints: start, streaming SSE/WebSocket messages, end, transcript
- [x] 4.2 Frontend pages: Login, Track selection, Scenario library, Briefing, Chat, Session end
- [x] 4.3 Chat UI with streaming tokens, timer, turn counter, end session confirmation
- [x] 4.4 Low-friction flow (<3 clicks to scenario)
- [x] 4.5 Accessibility & WCAG 2.1 AA compliance
- [x] 4.6 Mobile responsive design
- [x] 4.7 Component tests and Playwright e2e tests
- [x] GATE 4: End-to-end text session runs in headless browser in CI

## Phase 5: Evaluation, Scoring & Feedback
- [ ] 5.1 Evaluator prompt receiving transcript, criteria, rubrics, hidden motivations
- [ ] 5.2 Strict Pydantic schema validation & repair loop (up to 3 retries)
- [ ] 5.3 Deterministic score computation from weighted skills
- [ ] 5.4 Key moments with verbatim quote checking, alternative phrasing, reasoning
- [ ] 5.5 Grounded what worked / what didn't analysis
- [ ] 5.6 3-4 actionable improvement steps
- [ ] 5.7 Feedback report page with radar chart, transcript inspection, PDF export
- [ ] 5.8 Golden transcript consistency tests (good > average > poor)
- [ ] 5.9 Feedback engine tests
- [ ] GATE 5: Session completion produces validated, specific feedback report

## Phase 6: Voice Conversations
- [ ] 6.1 VoiceProvider interface and WebSocket protocol
- [ ] 6.2 Real-time audio streaming path (PCM16/Opus)
- [ ] 6.3 VAD and turn-taking with barge-in (<300ms interruption)
- [ ] 6.4 Fallback pipeline (STT -> LLM -> TTS) with sentence chunking
- [ ] 6.5 Persona voice mapping and style configuration
- [ ] 6.6 Unified transcript capture for identical evaluation pipeline
- [ ] 6.7 Latency instrumentation (p50/p95 reporting)
- [ ] 6.8 Browser audio client with mic permission, level meter, push-to-talk
- [ ] 6.9 Audio cost caps and usage event tracking
- [ ] 6.10 Mock voice tests and Playwright fake media stream tests
- [ ] GATE 6: Voice session completes with Mock provider, transcript, and evaluation

## Phase 7: Progress Tracking & Dashboards
- [ ] 7.1 Progress API: trends, streaks, averages, skill breakdowns
- [ ] 7.2 Trainee "My Progress" dashboard with skill charts and recommendations
- [ ] 7.3 Group admin cohort dashboard with member completion tables
- [ ] 7.4 CSV progress export
- [ ] 7.5 Privacy and multi-tenant isolation tests
- [ ] 7.6 Aggregation correctness and query performance tests
- [ ] GATE 7: Dashboards show verified correct metrics against seeded test dataset

## Phase 8: Admin Console
- [ ] 8.1 Cohort management: creation, 30-day window, passcode rotation, member view
- [ ] 8.2 Scenario manager: form editor, YAML editor with live validation, preview
- [ ] 8.3 Skill and rubric editor
- [ ] 8.4 Prompt & feedback evaluator tuning
- [ ] 8.5 Usage and cost tracking dashboard
- [ ] 8.6 Audit log viewer
- [ ] 8.7 Full admin lifecycle tests
- [ ] GATE 8: Owner manages complete cohort lifecycle from UI without code changes

## Phase 9: Security, Performance & Hardening
- [ ] 9.1 STRIDE threat model in `docs/SECURITY.md`
- [ ] 9.2 Input sanitization, CSP, CORS, security headers
- [ ] 9.3 25+ prompt injection attack test suite
- [ ] 9.4 Rate limiting across all API and WebSocket surfaces
- [ ] 9.5 Dependency vulnerability audits (pip-audit, npm audit)
- [ ] 9.6 Data retention policy, user deletion & export endpoints
- [ ] 9.7 Concurrent load testing (50 text, 10 voice sessions)
- [ ] 9.8 Structured JSON logging and observability hooks
- [ ] 9.9 Backup and restore scripts tested
- [ ] GATE 9: Security scans clean, load test results documented

## Phase 10: Documentation & Final Acceptance
- [ ] 10.1 Comprehensive README.md with one-command setup
- [ ] 10.2 User Guide and Admin Guide
- [ ] 10.3 Deployment Guide and Cost Model
- [ ] 10.4 Clean-room verification: clean setup, tests, acceptance run
- [ ] 10.5 Seeded demo cohort and passcode for instant evaluation
- [ ] 10.6 Final delivery report satisfying Definition of Done
- [ ] GATE 10 / DONE: Definition of Done fully satisfied
