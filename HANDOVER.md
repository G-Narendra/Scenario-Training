# 📘 3H Solutions ScenarioLab — Technical & Operational Handover Dossier

> **Executive Handover Document for Uzair & Technical Custodians**  
> This document details all credentials, architecture components, database operations, scenario modification protocols, and deployment pipelines required to independently operate, extend, or troubleshoot the 3H Solutions Executive Scenario Training Platform.

---

## 1. 🔑 System Access & Credentials Matrix

| Account / Role | Access Method | Passcode | Display Name | Purpose & Permissions |
|---|---|---|---|---|
| **Executive Facilitator (Uzair)** | Cohort Passcode Login | `UZAIR-2026` | `Uzair` | Full Facilitator Console, cohort creation, student whitelisting, attempt resets, group weakness debriefs, verbatim transcripts, and PDF export. |
| **Default Participant (Dev)** | Cohort Passcode Login | `UZAIR-2026` | `Dev` | Clean trainee experience. Used to audit simulations, attempt limits (Max 2 runs), and summary debriefs without admin controls. |
| **Developer Super Admin (Narendra)** | Master Passcode Login | `NARENDRA-2026` | `Narendra` | Global platform administration, schema migration, multi-cohort management, and LLM provider diagnostics. |

---

## 2. 🏛️ Core Architecture & Technology Stack

The platform is engineered as a modern, decoupled cloud application:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND PRESENTATION LAYER (Vite SPA)                                       │
│ • React 18, TypeScript, Tailwind CSS, Lucide Icons                          │
│ • Responsive Design: Mobile (iOS/Android) & Desktop (1440px+)               │
│ • Pure SVG Radar Chart (Spider Graph) — Vector-sharp in browser & print PDF │
│ • Dual-Tier Debrief Architecture: Student Summary vs Facilitator Dossier    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API & Server-Sent Events (SSE)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ BACKEND APPLICATION ENGINE (FastAPI)                                        │
│ • Python 3.12, FastAPI, Pydantic v2 (Strict Data Validation)                │
│ • SQLAlchemy 2.0 (AsyncIO), Alembic Database Migrations                     │
│ • AccessService: Argon2 Passcode Hashing, In-Memory Fast-Path Cache         │
│ • AttemptLedger: Strict 2-Attempt Lock per Scenario with Atomic Guarantees │
│ • ScoringService: 5-Dimensional Competency Evaluator & Quote Attribution    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Async Connection Pool
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ DATA & DEPLOYMENT LAYER                                                     │
│ • Database: SQLite (local/fallback) / Neon Serverless PostgreSQL           │
│ • Hosted Space: Hugging Face Spaces (Port 7860, Gradio/FastAPI container)   │
│ • Source Code: GitHub Repository (master branch)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 🎯 Curriculum & Scenario Structure (The 6 Pillars)

The curriculum is mathematically structured around **6 Executive Pillars**, containing **60 Core Competencies** and **60 Practice Scenarios**:

1. **Strategy & Market Leadership (10 Competencies)**: Long-range positioning, capital allocation, business model design.
2. **Cognitive Agility & Problem Solving (10 Competencies)**: First-principles root-cause discovery, crisis decision trees.
3. **People Leadership & Culture (10 Competencies)**: Executive coaching, underperformance turnaround, radical candor.
4. **Operational Execution & Governance (10 Competencies)**: Cross-functional friction resolution, SLA adherence, board defense.
5. **Personal Mastery & Resilience (10 Competencies)**: Emotional composure under hostile pushback, burn-out boundary setting.
6. **Influence & Executive Presence (10 Competencies)**: High-stakes commercial negotiation, C-suite alignment, procurement defense.

### Scenario Difficulty Tiers:
- **Level 1 (Normal / Easy)**: Foundation dialogue, constructive friction.
- **Level 2 (Challenging / Intermediate)**: Defensive counterparts, passive-aggressive pushback, multiple constraints.
- **Level 3 (Crisis / High-Stakes)**: Hostile counterparts, activist boardrooms, high capital or reputation risk.

*(Note: Competency mastery reached during evaluation is described using executive tiers—**Foundational, Developing, Proficient, Advanced, Executive Distinction**—to never be confused with the 3 scenario difficulty levels).*

---

## 4. 🚀 Local Development, Testing & Seeding Commands

All commands are executed using Python 3.12 and Node.js:

```bash
# 1. Activate Python Virtual Environment:
.venv\Scripts\activate   # (Windows)
source .venv/bin/activate # (Mac/Linux)

# 2. Seed Database (Official Cohorts, Passcodes, and Accounts):
python scripts/seed.py

# 3. Run Automated Test Suite (133+ Backend Verification Tests):
pytest -v backend/tests/

# 4. Build Frontend Production SPA Bundle:
npm --prefix frontend run build

# 5. Start Backend Server Locally:
uvicorn app:demo_app --host 0.0.0.0 --port 7860 --reload
```

---

## 5. 🌐 Remote Deployment & Synchronization Protocol

The application is deployed across two synchronized git remotes:
- **GitHub Repository**: `https://github.com/G-Narendra/Scenario-Training.git`
- **Hugging Face Space**: `https://huggingface.co/spaces/mrdev444/scenario-training-backend` (Port 7860)

### To Push Live Updates:
```bash
# 1. Build fresh frontend assets
npm --prefix frontend run build

# 2. Stage and commit
git add .
git commit -m "feat: describe your change"

# 3. Push to GitHub and HuggingFace
git push origin master
git push huggingface master:main
```
*(Hugging Face will automatically rebuild the container upon receiving git push to `main`).*

---

## 6. 📝 How to Add or Modify Scenarios

All scenarios are defined as human-readable YAML files in:
`backend/scenarios/leadership/` and `backend/scenarios/sales/`

### Template for New Scenario (`scenario-id.yaml`):
```yaml
id: leadership-31-new-scenario-slug
title: Managing an Entrenched Departmental Boundary Dispute
topic: conflict_resolution
track: leadership
difficulty: 2
difficulty_level: Challenging
primary_capability: Cross-Functional Alignment
duration_limit_seconds: 600
turn_limit: 8
counterpart_persona:
  name: Victoria Cross
  role: Head of Operations
  personality: Direct, protective of team bandwidth, skeptical of new corporate initiatives.
tactical_coaching_clue: "Acknowledge operational constraints before proposing shared metrics."
skills_assessed:
  - skill: boundary_defense
    weight: 0.35
  - skill: active_discovery
    weight: 0.35
  - skill: operational_closure
    weight: 0.30
```
Run `python scripts/seed.py` after adding or editing YAML files to sync them into the database.

---

## 7. 🛠️ Troubleshooting & Operational FAQs

### Q1: A student cannot log in and gets "Access Denied: Participant is not enrolled"?
- **Cause**: Uzair's official cohort (`UZAIR-2026`) enforces a strict security whitelist.
- **Fix**: Open the Facilitator Console -> *Participant Roster* -> Type the student's name into *Enroll New Participant* (or use *Bulk Paste*) -> Click *Enroll*. The participant can now log in immediately.

### Q2: A participant used their 2 practice runs and wants to retry?
- **Fix**: In the Facilitator Console -> *Participant Roster* -> Find the student -> Click *Reset Attempts*. Their 2-run allocation is instantly restored.

### Q3: How to export printable PDF reports for delegates?
- In the Facilitator Console, click *View Report* on any completed attempt -> Click **Export Executive PDF (.pdf)**. The browser will generate a formatted McKinsey-style PDF including the 3H Competency Spider Graph, verbatim dialogue moments, and developmental action steps.

### Q4: How to reach technical assistance?
- Email: `info@3hsolutionsgroup.com`
- WhatsApp Facilitator Channel: Integrated into platform footer.
