# Security Policy & Threat Model (STRIDE)

## 1. Threat Modeling (STRIDE)

| Threat Category | Potential Vector | Mitigation |
|---|---|---|
| **Spoofing** | Attacker impersonates cohort member or guesses passcode | Cryptographic random passcodes (8 chars from unambiguous alphabet), Argon2/bcrypt salted hashing, rate-limiting on login (5 attempts / 15 min lockout), timing-safe comparisons. |
| **Tampering** | User tampers with session tokens or modifies scenario YAML | HS256/RS256 JWT signature verification, strict Pydantic input schema validation, immutable scenario version snapshots. |
| **Repudiation** | User denies performing admin actions | Detailed audit logging (`audit_log` table) recording actor, IP, timestamp, action, and target entity. |
| **Information Disclosure** | Trainee inspects API responses or prompts to uncover hidden motivations | Strict Pydantic public schemas excluding hidden motivations, objections, and curveball logic. Prompts are never returned to client. Evaluator output carefully formats reveals as retrospective learning insights. |
| **Denial of Service** | Flooding chat or voice endpoints with messages | Token limits (4000 tokens/session), audio minute limits (15 min/session), IP-based rate limiting, WebSocket frame size limits. |
| **Elevation of Privilege** | Trainee accesses group admin or super admin endpoints | Role-Based Access Control (RBAC) enforced via FastAPI dependency injection guards (`require_group_admin`, `require_super_admin`). |

## 2. Security Headers & Network Hygiene
- Content Security Policy (CSP): restrict script execution to trusted domains.
- CORS: Explicit origin whitelist.
- Cookie attributes (if session cookies used): `HttpOnly`, `Secure`, `SameSite=Lax`.
- TLS required in production.
- No plain-text passcodes stored in DB or written to logs.
