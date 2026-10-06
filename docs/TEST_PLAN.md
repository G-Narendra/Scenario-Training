# Quality Assurance & Test Strategy

## 1. Test Pyramid & Methodologies
- **Unit Tests (`tests/unit/`)**:
  - Scoring arithmetic verification.
  - Cryptographic passcode generation and Argon2/bcrypt verification.
  - Scenario YAML Pydantic schema validation (valid and invalid test cases).
  - Curveball trigger condition evaluator.
  - Verifiable quote presence validation.
- **Integration Tests (`tests/integration/`)**:
  - Auth endpoints, token generation, 30-day cohort lifecycle, rotation, and revocation.
  - Scenario CRUD, version creation, hidden field filtering.
  - Full session lifecycle: start, message streaming with MockLLMProvider, turn limits, natural conclusion.
  - Feedback generation and JSON repair loop.
- **Contract & Security Tests (`tests/security/`, `tests/contract/`)**:
  - OpenAPI schema conformance.
  - 25+ prompt injection attack test cases against conversation engine.
  - Role-based authorization matrix enforcement.
  - Rate-limiting verification.
- **Golden Transcript Evaluation (`tests/ai/`)**:
  - 6 fixed golden transcripts (2 strong, 2 average, 2 weak).
  - Assert strictly deterministic score ordering: `score(strong) > score(average) > score(weak)`.
- **End-to-End Tests (`frontend/tests/`)**:
  - Playwright browser tests covering login -> scenario selection -> live conversation -> feedback report viewing.

## 2. Quality Gates
- **Coverage**: ≥ 85% on backend `app/`.
- **Linters**: Zero errors in `ruff check backend/` and frontend ESLint.
- **Type Checking**: Clean `mypy backend/` and `tsc --noEmit`.
- **Zero flaky tests**: Deterministic mock providers used by default.
