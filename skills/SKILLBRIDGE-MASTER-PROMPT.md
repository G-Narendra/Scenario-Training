# 🧠 MASTER PROMPT — AI Career Intelligence Platform
### Codename: `SkillBridge`
### Version: 1.1 | Full Loop Engineering Protocol

---

> **HOW TO USE THIS PROMPT:**
> Copy this entire document and paste it as your opening message to the AI agent. The agent will read the full loop protocol, activate each role in sequence, and build the complete production-ready platform without stopping.

---

## ⚠️ ABSOLUTE INVIOLABLE RULES (READ FIRST — NEVER VIOLATE)

These rules are mathematically non-negotiable. If you violate even one, STOP, rollback, and restart that phase.

1. **STRICT FOLDER SEPARATION:** You must maintain strict isolation between documentation and code. 
   - All research, ADRs, PRDs, and phase outputs go into `outputs/`.
   - All actual application code goes into `project/`. 
   - When initializing GitHub, you initialize it **INSIDE** the `project/` folder so the repository remains perfectly clean. Do not commit `outputs/`, `.venv`, or `skills/` to the project repository.
2. **NEVER install packages globally.** All dependencies are scoped (`npm install`, `pip install -r requirements.txt`, `poetry add`). Python virtual environments (`.venv`) must live in the root directory, outside the `project/` folder.
3. **NEVER skip a phase.** Every phase must produce verified outputs before the next begins.
4. **NEVER write code before architecture is approved.** Code written without a signed-off system design is deleted.
5. **NEVER commit secrets.** `.env` files, API keys, and tokens are in `.gitignore` from Day 0. Use environment variable injection.
6. **NEVER deploy without passing all automated tests.** The CI/CD pipeline is the only gate to production.
7. **NEVER bypass the Blind Reviewer.** Every output from every phase must go through the strict `[role]-strict-reviewer` protocol before advancing.
8. **USE A BIG STICK FOR A SMALL SNAKE.** Before solving any problem — no matter how small — consult `ECOSYSTEM_CATALOG.md` and invoke the exact FAANG expert for the job.
9. **LOOP UNTIL DONE.** Do not stop. Do not ask for permission. Complete the full loop and present a final report.

---

## 🎯 THE MISSION

**Platform Name:** SkillBridge AI
**Domain:** EdTech / AI-Powered Career Intelligence
**Target Users:** Early-career students (CS, Data Science, Engineering undergraduates)
**Stakeholders:** Professor Siddhaling Urolagin
**Core Value:** Replace static, keyword-stuffed CVs with verifiable, code-level proof of engineering competency.

### What We Are Building
An AI-powered platform (Web/Mobile App) that:
1. **Parses student CVs** to extract skills.
2. **Benchmarks** those skills against real industry requirements using **Nvidia NIMs** (free-tier optimized API for LLM inference).
3. **Diagnoses competency deficits**.
4. **Generates 3–4 scoped, production-grade project roadmaps**.
5. **Provisions GitHub/GitLab repositories** automatically via API, pre-populated with starter code, testing harnesses, and CI/CD.
6. **Integrates with Kaggle API** for ML tracks.
7. **Evaluates actual implementation** via real-time repository telemetry (commits, test passes, Kaggle scores).
8. **Synthesizes a verified digital portfolio**.

---

## 🔄 THE FULL LOOP ENGINEERING PROTOCOL

This is a continuous loop. You do NOT stop between phases. You advance only when all success criteria for the current phase are mathematically satisfied.

```
LOOP:
  WHILE (not all phases complete):
    1. Read loop state from outputs/.loop-state.json
    2. Identify current phase and pending roles
    3. Activate the next role using its YAML skill file
    4. Execute the implementation_checklist
    5. Produce outputs to the correct directory (outputs/ vs project/)
    6. Invoke the Blind Reviewer for that role
    7. Integrate reviewer feedback. If critical issues found → repeat step 3.
    8. Mark role complete in loop state
    9. If all roles in phase complete → mark phase complete → advance to next
  END WHILE
  10. Generate Final Delivery Report
```

---

## 📁 REQUIRED OUTPUT DIRECTORY STRUCTURE

Create this strict dual-folder structure from the very first phase. Never mix docs and code.

```
/ (Root Directory)
├── .venv/                              ← Python Virtual Environment
├── outputs/                            ← ALL RESEARCH, DOCS, AND REVIEWS
│   ├── .loop-state.json
│   ├── phase-0-understanding/
│   ├── phase-1-debate-and-research/
│   ├── phase-2-decision-and-architecture/
│   ├── phase-3-product-and-design/
│   └── reviews/
│
└── project/                            ← THE CLEAN CODEBASE (Initialize Git HERE)
    ├── .github/                        ← CI/CD Workflows
    ├── docker/                         ← Dockerfiles and Compose
    ├── terraform/                      ← IaC
    ├── backend/                        ← FastAPI, Services, Workers, DB Migrations
    └── frontend/                       ← Next.js / React Native mobile codebase
```

---

## 🚀 PHASE 0 — DEEP UNDERSTANDING

> **Objective:** Achieve first-principles clarity on the problem. Address Professor Siddhaling's requirements directly.

### Active Roles & Responsibilities

**`/idea-critic`** — Attack the idea before defending it.
- Challenge: Is an AI platform the right solution? How do we prevent students from just having the AI write the code for the projects we assign them?
- Output: `outputs/phase-0-understanding/idea-critique-report.md`

**`/problem-researcher`** — Verify the problem.
- Output: `outputs/phase-0-understanding/problem-statement.md`

**`/solution-debater`** — Address Professor Siddhaling's constraints.
- Brainstorm: Web App vs Mobile App vs Progressive Web App (PWA). What is the fastest path to MVP for students?
- Output: Append to problem-statement.md

### Phase 0 Success Criteria
- [ ] Problem statement validated.
- [ ] Idea critique formally responded to.
- [ ] Blind Review by `/idea-critic-strict-reviewer` passes.

---

## 🔥 PHASE 1 — DEBATE & RESEARCH

> **Objective:** Run a formal adversarial debate on technical decisions, focusing on latency, security, and dynamic providers.

### Active Roles & Responsibilities

**`/solution-debater`** — Run structured Socratic debates:
  1. **LLM Provider:** **Verdict Pre-Assigned:** Use **Nvidia NIMs** (free, high performance) for the initial MVP. Design a dynamic provider interface so we can easily swap to AWS Bedrock or OpenAI later when user scale increases.
  2. **Backend Language:** Python (FastAPI) vs. Node.js (Fastify).
  3. **Database:** PostgreSQL vs. Supabase.
  4. **Infrastructure:** Render/Railway vs Vercel for the prototype.
- Output: `outputs/phase-1-debate-and-research/technology-options-debate.md`

**`/competitive-analyst`** — Tear down the competition (LinkedIn, Forage).
- Output: `outputs/phase-1-debate-and-research/competitive-landscape.md`

**`/compliance-officer`** — Security & Privacy.
- CV data is PII. Ensure strict data-handling regulations are debated.
- Output: `outputs/phase-1-debate-and-research/regulatory-risk-analysis.md`

### Phase 1 Success Criteria
- [ ] All technology debates have a clear Verdict (Nvidia NIMs locked in for AI).
- [ ] Blind Review by `/competitive-analyst-strict-reviewer` passes.

---

## 🏗️ PHASE 2 — ARCHITECTURE & DECISION RECORDS

> **Objective:** Design the system. Focus on infrastructure, latency, and security.

### Active Roles & Responsibilities

**`/software-architect`** — Design the system topology.
- Define service boundaries inside the `project/` folder.
- Ensure the architecture isolates the AI calls to prevent latency bottlenecks.
- Output: `outputs/phase-2-decision-and-architecture/system-design.md`

**`/ai-architect`** — Design the Nvidia NIM LLM pipeline.
- Prompt Chain: CV Upload → NIM Extractor → Gap Analysis → Project Suggestion.
- Design the dynamic provider interface (Strategy Pattern).
- Output: Append to system-design.md

**`/security-architect`** — Threat model.
- STRIDE analysis. Protect GitHub API tokens.
- Output: `outputs/phase-2-decision-and-architecture/security-threat-model.md`

**`/api-engineer`** — OpenAPI 3.0 spec.
- Output: `outputs/phase-2-decision-and-architecture/api-specification.yaml`

### Phase 2 Success Criteria
- [ ] System design isolates AI calls and defines a dynamic LLM provider interface.
- [ ] Blind Review by `/software-architect-strict-reviewer` passes.

---

## 📋 PHASE 3 — PRODUCT & DESIGN

> **Objective:** Define the Web/Mobile App interface.

### Active Roles & Responsibilities
- **`/product-manager`** — Write the PRD (`outputs/phase-3-product-and-design/prd.md`).
- **`/ux-designer`** — Map user flows (CV Upload → Project Selection → GitHub Auth).
- **`/product-designer-ui`** — Design tokens and components.

### Phase 3 Success Criteria
- [ ] PRD complete.
- [ ] Blind Review by `/product-manager-strict-reviewer` passes.

---

## ⚙️ PHASE 4 — INFRASTRUCTURE & DevSecOps

> **Objective:** Build infrastructure as code INSIDE the `project/` directory.

### Active Roles & Responsibilities
- **`/devops-engineer`** — Scaffold `project/docker-compose.yml` for local dev.
- **`/devsecops-engineer`** — Scaffold GitHub Actions in `project/.github/workflows/`.
- **`/site-reliability-engineering`** — Define observability (Grafana/Prometheus) for latency tracking.

### Phase 4 Success Criteria
- [ ] Infrastructure code is correctly placed in `project/`.
- [ ] Blind Review by `/devops-engineer-strict-reviewer` passes.

---

## 💻 PHASE 5 — BACKEND ENGINEERING

> **Objective:** Write the core application code inside `project/backend/`.

### Active Roles & Responsibilities
- **`/backend-engineer-python`** — Build the FastAPI server.
- **`/llm-engineer`** — Implement the Nvidia NIM integration for CV Parsing and Gap Analysis. Ensure the dynamic provider interface is used.
- **`/integration-engineer`** — Implement GitHub API (repo provisioning) and Kaggle API integrations.
- **`/database-engineer`** — Implement PostgreSQL ORM and migrations.

### Phase 5 Success Criteria
- [ ] Backend code is entirely inside `project/backend/`.
- [ ] Nvidia NIM integration works end-to-end.
- [ ] Blind Review by `/backend-engineer-python-strict-reviewer` passes.

---

## 🎨 PHASE 6 — FRONTEND ENGINEERING

> **Objective:** Write the frontend code inside `project/frontend/`.

### Active Roles & Responsibilities
- **`/frontend-architect`** — Setup Next.js or React Native.
- **`/frontend-engineer`** — Build UI components.
- **`/web-performance-engineer`** — Ensure CV upload and AI processing states feel fast and responsive to the student.

### Phase 6 Success Criteria
- [ ] Frontend code is entirely inside `project/frontend/`.
- [ ] Blind Review by `/frontend-architect-strict-reviewer` passes.

---

## 🤖 PHASE 7 — AI ENGINE REFINEMENT

### Active Roles & Responsibilities
- **`/prompt-engineer`** — Version and refine prompts for the Nvidia NIMs.
- **`/llm-evaluator`** — Evaluate the quality of the recommended 3-4 projects against real student CVs.

### Phase 7 Success Criteria
- [ ] Project recommendations are highly accurate and scoped.
- [ ] Blind Review passes.

---

## 🔒 PHASE 8 & 9 — TESTING, SECURITY & LAUNCH

### Active Roles & Responsibilities
- **`/penetration-tester`** — Test API security.
- **`/performance-engineer`** — Load test the Nvidia NIM integrations.
- **`/product-marketing-manager`** — Draft the launch plan for students.

### Final Delivery Criteria
- [ ] All 9 phases marked `complete`.
- [ ] `project/` folder is perfectly clean, contains NO outputs/research, and has a `.git` repository initialized inside it.
- [ ] Nvidia NIM API is functioning and generating project roadmaps.
- [ ] All Blind Reviewer reports show zero `FATAL` findings.

---

## 🟢 START COMMAND

You have read the full Master Prompt. You understand the mission, the rules, the folder separation, and the loop.

**Now begin Phase 0. Activate `/idea-critic`. Load `ECOSYSTEM_CATALOG.md` to confirm all required roles are available. Create `outputs/.loop-state.json`. Do not stop until the Final Delivery Criteria are all checked.**
