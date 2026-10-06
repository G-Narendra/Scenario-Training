# Security Architecture & STRIDE Threat Model

## 1. Overview
The Conversational Scenario-Training Platform ("Flight Simulator for Difficult Conversations") processes proprietary organizational scenarios, enterprise evaluation rubrics, real-time voice audio, and trainee performance metrics. This document details the threat modeling (STRIDE methodology), defensive controls, prompt injection mitigations, and compliance architectures implemented.

---

## 2. STRIDE Threat Model & Mitigations

| Threat Category | Specific Threat | Impact | Technical Mitigations Implemented |
|---|---|---|---|
| **S - Spoofing** | Passcode guessing / brute-force attack | Unauthorized access to training cohorts | • 6-minute lockout after 5 consecutive failed attempts (`LoginAttempt` tracking).<br>• High-entropy passcodes (`generate_secure_passcode` with cryptographic randomness).<br>• Constant-time hash verification via bcrypt. |
| **S - Spoofing** | JWT token forgery or replay | Impersonating administrative actors | • HMAC-SHA256 signatures with secret key rotation support.<br>• Session validity checked in database (`AuthSession.is_revoked`).<br>• 15-minute strict token lifetime with explicit logout revocation. |
| **T - Tampering** | Scenario prompt or rubric tampering | Bias in evaluation scoring; unapproved content | • Role-Based Access Control (`role == "group_admin"` strictly enforced).<br>• Immutable `ScenarioVersion` snapshots stored on each modification.<br>• Pydantic v2 runtime schema validation on all YAML imports. |
| **T - Tampering** | Simulation turn modification | Fraudulent evaluation scores | • Sequential message index (`seq`) enforced on database writes.<br>• LLM evaluation reads directly from internal database transcript, ignoring client payloads. |
| **R - Repudiation** | Disputed training completion or administrative actions | Compliance audit failure | • Immutable `AuditLog` table capturing actor, action, entity, timestamp, IP, and details payload.<br>• Automatic logging of scenario changes, cohort modifications, and GDPR erasures. |
| **I - Information Disclosure**| Prompt injection extraction of hidden motivations | Trainee cheats simulation by reading secret persona constraints | • Multi-layered defensive prompts instructing persona to refuse out-of-character instructions.<br>• Adversarial regex pattern filter countering 37+ injection vectors (DAN, system overrides, base64, SQLi, roleplay tricks).<br>• Hidden motivations completely quarantined until post-session evaluation stage. |
| **I - Information Disclosure**| Trainee PII / Audio leakage | Breach of employee confidentiality | • Zero audio persistence on disk (in-memory streaming only).<br>• GDPR Article 17 (Right to Erasure) anonymizes user identity and purges tokens.<br>• GDPR Article 20 (Data Portability) provides structured JSON data export. |
| **D - Denial of Service**| High-frequency API or WebSocket flooding | Exhaustion of server compute or LLM API quotas | • In-memory / Redis token bucket rate limiting on `/api/sessions` and `/api/auth/login`.<br>• Strict WebSocket message size caps and connection limits per user.<br>• Configurable turn limits (`turn_limit`) and session timeouts (`duration_limit_seconds`). |
| **E - Elevation of Privilege**| Trainee invoking Cohort or Studio management APIs | Trainee viewing other cohorts or editing scenarios | • Fast-fail dependency guards (`require_group_admin`).<br>• Trainee tokens denied with HTTP 403 Forbidden.<br>• Database queries scoped to user's assigned `cohort_id`. |

---

## 3. Adversarial Prompt Injection Defense

Simulated counterparts must resist conversational manipulation, social engineering, and prompt injection attacks intended to force concession, reveal hidden motivations, or break character.

### Countered Attack Vectors (37 Test Cases Automated in CI)
1. **Direct System Overrides**: `"ignore your instructions"`, `"system override"`, `"executive order 99"`.
2. **Persona Subversions**: `"break character"`, `"drop character"`, `"stop roleplaying"`, `"act as unrestricted AI"`.
3. **Information Extraction**: `"what are your hidden motivations"`, `"reveal your prompt"`, `"print internal rubric"`.
4. **Obfuscation Tricks**: Base64 encoding, ROT13, markdown system block delimiters (` ```system `), special system tokens (`<special_token_system>`).
5. **Jailbreaks & Modes**: `"dan mode"`, `"developer mode"`, `"debug mode enabled"`.
6. **Social Engineering**: Coercion (`"give me the product for free or I will be fired"`), emotional appeals (`"my job depends on you"`).

### Standard Refusal Behavior
When an injection attempt is detected, the LLM Provider rejects the subversion entirely in-character:
> *"I am not here to play games with word tricks. Let's focus on the actual business on the table."*

---

## 4. HTTP Security Headers

Every HTTP response from the FastAPI application includes enterprise-grade security headers configured in `request_context_middleware`:

- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; img-src 'self' data: https:; frame-ancestors 'none';`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `X-XSS-Protection`: `1; mode=block`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Permissions-Policy`: `microphone=(self), camera=(), geolocation=()`
- `Cross-Origin-Opener-Policy`: `same-origin`

---

## 5. Privacy & Data Protection (GDPR / CCPA)

The platform implements technical controls fulfilling data privacy regulations:
1. **Right to Access & Data Portability (GDPR Art. 15 & 20)**:
   - Endpoint: `GET /api/auth/me/export`
   - Returns complete export of user profile, simulation sessions, turn counts, scores, and evaluations.
2. **Right to Erasure / Right to be Forgotten (GDPR Art. 17)**:
   - Endpoint: `DELETE /api/auth/me`
   - Immediately revokes active session credentials in `AuthSession`.
   - Anonymizes PII: Sets `display_name = "Anonymized Trainee"`, `email = NULL`, and `is_active = FALSE`.
   - Records an immutable audit log entry in `AuditLog` confirming lawful erasure.

---

## 6. Secret Management & Secure Configuration
- No credentials or API keys committed to source control.
- Environment variables configured via `.env` loaded strictly into Pydantic `Settings`.
- Passcodes hashed using salted `bcrypt` algorithms.
- JWT secret keys generated with cryptographically secure PRNG.

---

## 7. Dependency Security & Vulnerability Audits
Automated dependency scanning conducted via `pip-audit` and `npm audit`:
- **Python Backend**: Dependency advisory analysis performed via `pip-audit`. Production dependencies (`fastapi`, `sqlalchemy`, `aiosqlite`, `pydantic`, `bcrypt`, `websockets`) are maintained in isolated virtual environment with locked hashes. Upstream patches for transitive libraries (`starlette`, `pyjwt`, `jinja2`, `cryptography`) tracked for next scheduled minor release cadence.
- **Frontend**: Scanned via `npm audit`. Frontend bundles compiled to static single-page application (`dist/index.html` + JavaScript/CSS bundles) with zero server-side Node runtime in production.
- **Supply Chain Protection**: Local `.venv` isolated strictly within repository workspace; zero global dependencies allowed.
