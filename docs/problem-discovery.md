# Product Requirements Document (PRD)

## 1. Executive Summary
The "Flight Simulator for Difficult Conversations" is an interactive, AI-driven roleplay platform designed to train salespeople, managers, and emerging leaders in high-stakes people situations. Trainees engage in live conversations (via text chat or natural speech) with simulated counterparts (demanding clients, defensive employees, stressed peers) who adapt dynamically with authentic resistance, emotion, and curveballs. Upon scenario conclusion, the system delivers structured, actionable feedback with specific moment analysis and drill-based improvement steps.

## 2. Target Audience & Roles
- **Trainee**: Corporate employee (salesperson, manager, team lead) honing conversation skills. Needs low friction, fast entry (<3 clicks), authentic dialogue, and constructive feedback.
- **Group Admin (Owner / Trainer)**: Training provider or company L&D leader who provisions access to training cohorts for 30-day windows, rotates passcodes, creates/edits scenarios, and tracks cohort progress.
- **Super Admin**: Platform operator managing global settings, system health, and cross-cohort analytics.

## 3. Product Tracks
### 3.1 Sales Track
Focuses on objection handling, discovery questioning, enterprise renewal negotiations, closing, client recovery after failures, and communicating with diverse buyer personas (skeptical senior buyers, digital-native founders).

### 3.2 Leadership Track
Focuses on delivering constructive feedback to defensive or emotional reports, coaching underperformers, resolving peer-level conflict, delivering hard organizational messages (reorgs, role changes), and managing up to unrealistic leadership demands.

## 4. Key Functional Features
1. **Curated Hybrid Scenario Engine**: Data-driven scenarios authored in YAML with strict validation, persona rules, hidden motivations, objections, curveballs, and success criteria.
2. **Conversational Interface**: Real-time free-form text chat and low-latency voice mode with barge-in support and voice activity detection.
3. **Structured Evaluation & Scoring**: Deterministic overall score calculation based on skill weights; key moments highlighting exact quotes, alternatives, and "why this works" explanations; 3-4 concrete practice drills.
4. **Cohort Access Control**: Strict 30-day cohort lifecycle, rotated passcode credentials, session limits, instant revocation.
5. **Progress & Analytics Dashboard**: Individual skill trajectory charts, cohort completion metrics, exportable reports.
6. **Admin Console**: Scenario visual & YAML editor, version tracking, cohort lifecycle manager, audit logging.

## 5. Non-Functional Requirements
- **Latency**: First response token < 1.5s p50 in text; speech-to-audio turnaround < 1.5s p50 in voice.
- **Availability & Portability**: Deployable via Docker; zero global system dependencies.
- **Security**: Argon2/bcrypt passcode hashing, JWT token expiration, strict rate limits, prompt-injection defense, constant-time comparisons.
