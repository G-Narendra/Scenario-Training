# Architectural Decision Records (ADRs)

## ADR-001: Target Platform & Framework Selection
- **Status**: Accepted
- **Context**: The application trains professionals through interactive conversational roleplay. Needs responsive, frictionless access on mobile and desktop without app store friction.
- **Decision**: Responsive Single Page Application (PWA-capable) built with React 18+, TypeScript, Vite, and Tailwind CSS.
- **Consequences**: Fast startup, zero app store deployment overhead, works across all client devices.

## ADR-002: Backend Framework & Database Layer
- **Status**: Accepted
- **Context**: Real-time streaming, WebSockets, typed schemas, and fast async I/O are core requirements.
- **Decision**: Python 3.11+ with FastAPI, Pydantic v2 for data validation, SQLAlchemy 2.0 (asyncio) with Alembic migrations. SQLite with `aiosqlite` for local dev/testing; PostgreSQL with `asyncpg` for production and Docker containers.
- **Consequences**: High async performance, robust type safety, swappable database backends.

## ADR-003: LLM Provider Abstraction
- **Status**: Accepted
- **Context**: System must support multiple model providers (Anthropic Claude, OpenAI) while remaining 100% testable without paid API costs.
- **Decision**: Abstract LLM operations behind `LLMProvider` protocol (`stream_chat`, `complete`). Implement `MockLLMProvider` (deterministic, zero external calls), `AnthropicProvider`, and `OpenAIProvider`.
- **Consequences**: Unit and integration test suites run fast and free with the Mock provider; live tests run opt-in.

## ADR-004: Voice Conversation Architecture
- **Status**: Accepted
- **Context**: Real-time voice interaction requires low latency, natural turn-taking, barge-in support, and fallbacks.
- **Decision**: Abstract behind `VoiceProvider` interface over WebSocket. Support direct realtime audio where available, with a streaming fallback pipeline (VAD/STT -> streaming LLM -> streaming TTS). Include `MockVoiceProvider` for deterministic testing. Transcribe all audio turns to messages for unified evaluation.
- **Consequences**: Consistent evaluation whether session is voice or text; robust testing without paid voice services.

## ADR-005: Scenario Configuration Architecture (Hybrid Model)
- **Status**: Accepted
- **Context**: Content must be authored, validated, and updated without redeploying code, while AI improvises realistically within strict guardrails.
- **Decision**: Hybrid approach. Scenario definitions are structured YAML/JSON data with strict Pydantic schema validation. AI character improvises dialogues within the defined persona, hidden motivations, curveballs, and success criteria. Admin UI provides validation and preview.
- **Consequences**: Non-technical authors can add/edit scenarios; zero code changes needed for new content.

## ADR-006: Cohort-Based Access Control & Rotating Passcodes
- **Status**: Accepted
- **Context**: The business model trains cohorts for 30-day windows. No public signups. Passcodes rotate to prevent unauthorized distribution.
- **Decision**: Passcode-based authentication with display name. Passcodes stored only as salted cryptographic hashes (`secrets` module + Argon2/bcrypt/PBKDF2-HMAC-SHA256). Hard 30-day cohort expiry enforced at API middleware layer. Token expiration tied to remaining cohort lifetime (capped at 12 hours). Passcode rotation invalidates prior codes.
- **Consequences**: Simple trainee onboarding (<3 clicks to scenario), airtight 30-day access enforcement, no plain passcodes persisted.

## ADR-007: Strict Feedback Schema & Deterministic Scoring
- **Status**: Accepted
- **Context**: Trainees need actionable, consistent feedback without generic platitudes or hallucinated arithmetic.
- **Decision**: Evaluator returns structured JSON strictly adhering to schema. Quoted moments must match transcript verbatim (enforced by automated verification & repair loop). Overall score is computed deterministically by backend code using weighted skill scores: `overall = round(sum(weight * (score - 1) / 4) * 100)`.
- **Consequences**: Reliable, trustworthy evaluations with verifiable transcript evidence.
