# Project Risk Register

| Risk ID | Description | Severity | Likelihood | Mitigation Strategy | Status |
|---|---|---|---|---|---|
| R-001 | LLM API rate limits or downtime during active live roleplay | High | Medium | Implement exponential backoff, retry queues, graceful session state persistence, and swappable provider failover. | Mitigated |
| R-002 | Token and voice minute cost overruns by high-volume cohorts | High | High | Enforce hard session token caps (4000 tokens), session audio caps (15 mins), and cohort-level monthly budget thresholds ($100 USD). | Mitigated |
| R-003 | Trainee prompt injection / jailbreaks attempting to break character or reveal hidden notes | Medium | High | Robust multi-layer system prompts, anti-injection framing, strict output filters, and continuous test harness with 25+ attack prompts. | Mitigated |
| R-004 | Evaluator hallucination or inaccurate transcript quotes | High | Medium | Verifiable quote validator matching trainee dialogue against transcript; automatic repair loop (up to 3 retries) with fallback. | Mitigated |
| R-005 | Cohort passcode leakage outside intended group | Medium | High | Support rotated passcodes, individual 1-time binding codes, instant admin revocation, and strict 30-day cohort lifecycle cutoff. | Mitigated |
| R-006 | High audio latency degrading voice roleplay immersion | High | Medium | Client barge-in detection (<300ms), streaming sentence chunking, p50/p95 latency metrics tracking, and fallback to text mode. | Mitigated |
