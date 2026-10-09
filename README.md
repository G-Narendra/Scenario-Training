# ScenarioLab — Workplace Scenario Training

> An enterprise-grade, conversational scenario-training platform designed to help professionals master high-stakes interpersonal situations—negotiations, executive pushback, performance reviews, and conflict de-escalation—through realistic AI counterparts and multidimensional feedback.

---

## 1. Quickstart (One Command)

### Prerequisites
- **Python**: 3.12+ (isolated in project `.venv`, zero global pip packages)
- **Node.js**: 20+ and npm

### Instant Local Setup

#### Windows (PowerShell):
```powershell
# 1. Run automated environment setup
.\scripts\setup.ps1

# 2. Seed database with 16 skills, 14 published scenarios, and demo cohorts
.\.venv\Scripts\python scripts\seed.py

# 3. Start development servers (Backend: 8000, Frontend: 5173)
.\scripts\run_dev.ps1
```

#### Linux / macOS (Bash):
```bash
# 1. Run automated environment setup
chmod +x ./scripts/*.sh
./scripts/setup.sh

# 2. Seed database
./.venv/bin/python scripts/seed.py

# 3. Start development servers
./scripts/run_dev.sh
```

---

## 2. Instant Demo Credentials

Access the application in your browser at `http://localhost:5173`:

| Role | Passcode | Accessible Features |
|---|---|---|
| **Trainee (Sales & Leadership)** | `DEMO-2026` | 14 Scenarios, Text Chat, Voice Mode, Real-time Turn Feedback, Radar Charts, Personal Drills, GDPR Data Export & Account Deletion |
| **Group Administrator** | `ADMIN-PASS` | Cohort Management (30-day windows, token rotation), Scenario Studio (Live YAML Editor, Schema Validator, AI Generator), Cost Telemetry, System Audit Logs |

---

## 3. Key Architecture & Features

### 3.1 Realistic AI Counterparts
- **Dual Conversational Modes**:
  - **Text Mode**: SSE streaming (`text/event-stream`), turn limits, dynamic timer, in-character refusal of conversational manipulation.
  - **Voice Mode**: Full-duplex WebSocket (`/api/sessions/{id}/voice`), binary audio chunk streaming (PCM16/Opus), Voice Activity Detection (VAD) with sub-300ms barge-in interruption.
- **Dynamic Scenario Engine**:
  - Hidden motivations revealed only post-session or under strategic discovery questions.
  - Conditional curveballs triggered dynamically based on turn counts or conversational cues.
  - Natural conclusion detection recognizing commitments or definitive walkaways.

### 3.2 Multidimensional Evaluation & Scoring
- Comprehensive rubric evaluations evaluating up to 16 concrete skills (1–5 scale).
- **Radar Charts & Performance Trends**: Trainee skill distribution, historical progression streaks, and average scores.
- **Key Moments Analysis**: Pinpoints turning points in dialogue transcripts with exact quotes, better alternative phrasing, and psychological rationale.
- **Targeted Practice Drills**: Automated 3–4 tailored drills generated for identified weaknesses.

### 3.3 Scenario Studio & Admin Console
- **Live YAML Validator**: Validates persona schemas, emotional baselines, difficulty ratings (1–5), and normalized skill weight sums ($\sum w_i = 1.0$).
- **AI Scenario Drafting**: Generates full YAML scenario drafts with realistic personas and curveballs from natural-language descriptions.
- **Cohort Lifecycle**: Strict 30-day cohort access windows, cryptographic passcode rotation, and instant session revocation.
- **Audit & Cost Telemetry**: Granular token and audio billing metrics alongside immutable audit trails.

### 3.4 Enterprise Security & Privacy
- **Adversarial Injection Defense**: 37+ automated test cases verifying zero secret prompt leaks and in-character refusal.
- **STRIDE Threat Model**: Detailed mitigations documented in [`docs/SECURITY.md`](docs/SECURITY.md).
- **HTTP Security Headers**: Strict CSP, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, Referrer-Policy.
- **GDPR Compliance**: Article 20 data portability (`GET /api/auth/me/export`) and Article 17 right to erasure (`DELETE /api/auth/me`).
- **Database Scalability**: SQLite Write-Ahead Logging (WAL mode) with 60-second busy timeout; PostgreSQL production ready via asyncpg.

---

## 4. Testing & Verification

### Running Complete Verification Suite
```powershell
# Windows
.\scripts\run_tests.ps1

# Linux / macOS
./scripts/run_tests.sh
```

### Individual Test Commands

#### Backend Test Suite (Pytest with $\ge 85\%$ coverage threshold):
```powershell
.\.venv\Scripts\Activate.ps1
pytest backend/tests -v --cov=backend/app --cov-report=term-missing
```

#### Linting & Type Checking:
```powershell
ruff check backend scripts
mypy backend/app
```

#### Frontend Build & Playwright E2E Tests:
```bash
cd frontend
npm run build
npm run test:e2e
```

#### Concurrent Load Testing (50 Text + 10 Voice Sessions):
```powershell
.\.venv\Scripts\python scripts\load_test.py
```

#### Database Backup & Restore:
```powershell
# Create timestamped backup with SHA-256 verification
.\.venv\Scripts\python scripts\backup.py

# Restore database from archive
.\.venv\Scripts\python scripts\restore.py --file backups\backup_YYYYMMDD_HHMMSS.db
```

---

## 5. Project Structure

```
Scenario-Training/
├── backend/
│   ├── app/
│   │   ├── ai/               # Conversation engine, prompt builders, LLM providers (Mock/OpenAI/Anthropic)
│   │   ├── api/              # FastAPI routers (auth, scenarios, sessions, progress, admin)
│   │   ├── db/               # SQLAlchemy models, sessions, base classes
│   │   ├── schemas/          # Pydantic v2 schemas and request/response models
│   │   ├── security/         # Auth, passcodes, JWT, rate limiting, dependency guards
│   │   ├── services/         # Scenario service, scoring service, access service, progress service
│   │   └── voice/            # Voice WebSocket handlers, providers, protocols
│   ├── alembic/              # Database migration scripts
│   ├── scenarios/            # YAML seed files (16 skills, 14 scenarios)
│   └── tests/                # Unit and integration test suites (126+ tests)
├── frontend/
│   ├── src/
│   │   ├── api/              # Strongly-typed API client and SSE streaming helpers
│   │   ├── components/       # UI components (RadarChart, TranscriptViewer, VoiceMeter, Navbar)
│   │   ├── pages/            # View pages (LoginPage, ScenarioSelectionPage, SimulationChatPage,
│   │   │                     #             FeedbackReportPage, ProgressDashboardPage, AdminConsolePage)
│   │   └── types/            # TypeScript interfaces
│   └── tests/                # Playwright end-to-end browser specs
├── scripts/                  # Automated setup, test, load test, backup, restore, and seed scripts
└── docs/                     # Comprehensive architecture, security, PRD, and operational guides
```

---

## 6. Documentation Directory
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): System design, components, and data flows.
- [`docs/SECURITY.md`](docs/SECURITY.md): STRIDE threat model, injection mitigations, and compliance.
- [`docs/COST_MODEL.md`](docs/COST_MODEL.md): Token/audio cost models, unit economics, and budget caps.
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md): Trainee 3-click guide and report navigation.
- [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md): Administrator cohort and studio management instructions.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Cloud and container production setup.
