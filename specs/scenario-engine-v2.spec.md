# 🏛️ SPEC-002: Scenario Engine v2 & 3H Solutions Enterprise Training Platform
**Status**: APPROVED & LOCKED  
**Client**: Uzair | 3H Solutions Group (https://www.3hsolutionsgroup.com/)  
**Lead Solutions Architect**: Antigravity Principal Engineer  
**Standard**: 10+ Year Staff FAANG & Senior vs Student Standard (`AGENTS.md`)

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 Client Directives & Ground Truth Synthesis
Following comprehensive review of `feedback/Narendra and Uzair conversation.txt`, `feedback/Leadership capabilities 160.pdf`, and `feedback/intial thought on prototype.ppt`:
1. **Directive 1 (Corporate Branding)**: Transition application branding to **3H Solutions Group** (`https://www.3hsolutionsgroup.com/`), incorporating the official 3H Solutions visual identity, navy/orange palette, and company logo in headers, briefings, and PDF exports.
2. **Directive 2 (50 Curated Scenarios)**: Expand catalog from 14 to **50 production-grade scenarios** (25 Leadership + 25 Sales), mapped directly to the 160 leadership capabilities and enterprise sales disciplines.
3. **Directive 3 (Difficulty Levels 1-5)**: Implement explicit, prominent 5-tier difficulty classification across catalog cards, filter bars, briefing headers, and evaluation reports.
4. **Directive 4 (Senior Executive Accessibility & Tactical Clue Overhaul)**: Overhaul the platform for senior leaders with eyesight limitations. Increase body fonts to >= 16px (dialogue to 18px), eliminate all low-contrast dark-on-dark elements, and transform the "Tactical Coaching Clue" from a low-contrast footnote into a prominent, high-contrast amber-bordered card with an expandable modal drawer.
5. **Directive 5 (Simulation Turn Robustness & Interaction Fixes)**: Fix the single-turn conversation cutoff bug caused by over-eager conclusion regexes. Guarantee multi-turn interactions up to 25 exchanges or 10 minutes with contextual counterpart dialogue and dependable voice fallback.

---

## 2. 50-Scenario Catalog Taxonomy & Capability Mapping

### 2.1 Leadership Track (25 Scenarios Mapped to 160 Capabilities)

| ID | Title | Difficulty | Target Capabilities (from 160 PDF) | Primary Tension |
|---|---|---|---|---|
| `lead-01` | Specific Recognition for Quiet High Performer | 1 (Foundational) | Recognition & Rewards, Empathy, Managing Self | Downplays impact; hates public spotlight. |
| `lead-02` | Addressing Chronic Punctuality & Meeting Lateness | 1 (Foundational) | Set Clear Expectations, Discipline, Accountability | Defensive about flexible hours vs team impact. |
| `lead-03` | Coaching Underperformer Who Blames Tooling | 1 (Foundational) | Problem Solving, Coaching, Self Accountability | Externalizes fault to third-party APIs. |
| `lead-04` | Resolving Cross-Functional Workflow Friction | 1 (Foundational) | Collaboration & Team Building, Listening Skills | Product vs Engineering sprint friction. |
| `lead-05` | Setting Work-Life Boundaries for Burnt-Out Lead | 1 (Foundational) | Managing Resources, Empathy, Well-Being | Martyr complex; refuses to delegate. |
| `lead-06` | Delivering Constructive Quality Feedback to Senior | 2 (Intermediate) | Performance Management, Feedback Specificity | Senior engineer defensive about PR review comments. |
| `lead-07` | Managing Scope Creep with Demanding Peer Director | 2 (Intermediate) | Assertiveness, Prioritization, Negotiation | Pressure to slip uncommitted features into release. |
| `lead-08` | Coaching Associate on Client Presentation Anxiety | 2 (Intermediate) | Talent Development, Mentoring, Confidence | Frozen during executive briefings. |
| `lead-09` | Aligning Disjointed Team Around Quarterly OKRs | 2 (Intermediate) | Vision into Reality, Team Alignment, Goal Setting | Team members pulling in different directions. |
| `lead-10` | Addressing Passive-Aggressive Slack Communication | 2 (Intermediate) | Psychological Safety, Culture Building, Clarity | Snarky comments undermining psychological safety. |
| `lead-11` | Mediating Toxic High-Performer Interpersonal Friction| 3 (Advanced) | Conflict Management, Culture Building, Accountability| 10x developer belittles junior engineers. |
| `lead-12` | Announcing Reorganization & Role Repositioning | 3 (Advanced) | Change Management, Empathy, Clarity | Direct report fearing demotion in reorg. |
| `lead-13` | Pushing Back Against Unrealistic Executive Deadline | 3 (Advanced) | Courageous Conversations, Strategic Thinking, Composure| VP demanding impossible 4-week delivery date. |
| `lead-14` | Navigating Budget Cut Allocations Across 2 Leads | 3 (Advanced) | Financial Acumen, Resourcefulness, Decisiveness | Having to cut 20% headcount or contractor budget. |
| `lead-15` | Mentoring Stagnating Mid-Career Lead for Growth | 3 (Advanced) | Foster Potential, Growth Mindset, Critical Thinking | Lead comfortable in comfort zone resisting AI tooling. |
| `lead-16` | Retaining Critical Tech Lead Counter-Offering Google | 4 (High-Stakes) | Persuasion Skills, Building Trust, Retention | Lead has signed offer; 48 hours to renegotiate. |
| `lead-17` | Handling Severe Emotional Outburst Post-Review | 4 (High-Stakes) | Emotional Intelligence, Face Pressure with Grace | Employee breaks down in tears claiming bias. |
| `lead-18` | Managing Cross-Silo Territorial Feud | 4 (High-Stakes) | Stakeholder Management, Corporate Governance | Operations VP refusing data access to AI initiative. |
| `lead-19` | De-escalating Major Production Outage Blame Game | 4 (High-Stakes) | Blame Culture, Root Cause Discovery, Composure | Severity 1 outage causing executive finger-pointing. |
| `lead-20` | Guiding Radical AI Transformation & Workforce Anxiety | 4 (High-Stakes) | Digital Savvy, Adaptability, Ability to Inspire | Whole department fearful of job displacement. |
| `lead-21` | Executive Whistleblower on Vendor Kickbacks | 5 (Crisis) | Ethical Leadership, Accountability, Governance | Procurement lead reveals senior VP kickback scheme. |
| `lead-22` | Hostile Activist Boardroom Defense Strategy | 5 (Crisis) | Strategic Thinking, Influencing Skills, Gravitas | Hostile board member demanding CEO resignation. |
| `lead-23` | Emergency Layoff Notification & Dignity Preservation | 5 (Crisis) | Empathy, Courageous Conversations, Integrity | Communicating immediate termination to 10-year veteran. |
| `lead-24` | Customer Data Privacy Breach Containment | 5 (Crisis) | Crisis Management, Certainty Awareness, Speed | Regulators and enterprise clients demanding answers. |
| `lead-25` | Founder vs Board Control & Strategic Pivot Crisis | 5 (Crisis) | Visionary, Negotiation Skills, Decisiveness | Conflict over company direction at existential crossroads. |

---

### 2.2 Sales Track (25 Scenarios Across Enterprise Buying Cycle)

| ID | Title | Difficulty | Target Sales Capabilities | Primary Resistance |
|---|---|---|---|---|
| `sale-01` | Inbound SDR Qualification with Guarded Prospect | 1 (Foundational) | Discovery Questions, Rapport Building | Polite prospect giving short, unrevealing answers. |
| `sale-02` | Handling Initial Price Inquiry Without Caving | 1 (Foundational) | Value Articulation, Objection Handling | "Just send me your pricing sheet before a demo." |
| `sale-03` | Scheduling Next Steps with Indifferent Middle Manager | 1 (Foundational) | Closing & Next Steps, Tone Confidence | "Looks interesting, check back in 6 months." |
| `sale-04` | Uncovering Daily Workflow Pain Points | 1 (Foundational) | Discovery Questions, Active Listening | Prospect insists "current manual spreadsheets are fine." |
| `sale-05` | Qualifying Inbound Lead with Unrealistic Expectations | 1 (Foundational) | Expectation Management, Clarity | Prospect wanting enterprise custom SLA on self-serve plan. |
| `sale-06` | Overcoming Incumbent Vendor Entrenchment | 2 (Intermediate) | Competitive Differentiation, Reframing | "We've used Salesforce for 10 years, not switching." |
| `sale-07` | Mid-Market Discovery with Hesitant Operations Director| 2 (Intermediate) | Problem Diagnosing, Psychological Safety | Fear that new software will disrupt warehouse floor. |
| `sale-08` | Reframing 15% Budget Cut at Contract Renewal | 2 (Intermediate) | Value Defense, Trading Concessions | Customer demanding automatic 15% discount to renew. |
| `sale-09` | Presenting Tailored ROI Case Study to Controller | 2 (Intermediate) | Financial Acumen, Value Articulation | Skeptical finance analyst picking apart soft ROI claims. |
| `sale-10` | Navigating Early Gatekeeper Resistance | 2 (Intermediate) | Persuasion, Tone & Gravitas | Executive Assistant refusing to pass call to CTO. |
| `sale-11` | Defending Price Against Aggressive Procurement Buyer | 3 (Advanced) | Negotiation, Composure, Trading Terms | Professional procurement negotiator playing hardball. |
| `sale-12` | Multi-Stakeholder Demo with Competing Department Goals| 3 (Advanced) | Stakeholder Alignment, Active Listening | Security wants lockdown; Marketing wants open API. |
| `sale-13` | Winning Back At-Risk Enterprise Account Post-Outage | 3 (Advanced) | De-escalation, Empathy, Restoring Trust | Enterprise account threatening immediate breach penalty. |
| `sale-14` | Displacing Hostile Niche Competitor During RFP | 3 (Advanced) | Differentiation, Objection Handling | RFP rigged by competitor consultant. |
| `sale-15` | Accelerating Stalled Q4 Enterprise Deal | 3 (Advanced) | Urgency Creation, Closing Next Steps | Champion went silent after receiving final contract. |
| `sale-16` | Navigating Infosec & Legal Redlines Deadlock | 4 (High-Stakes) | Contract Negotiation, Risk Mitigation | Enterprise General Counsel refusing liability terms. |
| `sale-17` | Skeptical CFO Demanding Hard Payback Under 6 Months | 4 (High-Stakes) | Executive Gravitas, Financial Acumen | CFO threatening to kill project without cash breakeven. |
| `sale-18` | Managing Executive Champion Departure Mid-Deal | 4 (High-Stakes) | Account Strategy, Rapid Discovery | Key internal sponsor resigned; replacement is skeptical. |
| `sale-19` | Upselling Multi-Year Enterprise Expansion to VP | 4 (High-Stakes) | Strategic Account Growth, Value Realization | Expanding from 500 seats to 5,000 across global ops. |
| `sale-20` | Rescuing Pilot Proof-of-Concept Technical Failure | 4 (High-Stakes) | Crisis Communication, Accountability | Ingestion pipeline choked on client's legacy database. |
| `sale-21` | Global Multi-Million Dollar Master Services Agreement | 5 (Crisis) | Enterprise Master Negotiation, Boardroom | Final 3-day round with Fortune 50 Global CPO. |
| `sale-22` | Hostile Vendor Replacement in Unionized Enterprise | 5 (Crisis) | Political Acumen, Change Management | Plant managers threatening union grievance over metrics. |
| `sale-23` | Surviving Executive Board Committee Grill Session | 5 (Crisis) | Board Presence, Rapid Q&A Defense | 15 minutes before Board of Directors to defend tender. |
| `sale-24` | Renegotiating Catastrophic Contract Terms Under Merger | 5 (Crisis) | Contract Law, Multi-Party Bargaining | Client acquired by rival; new management reviewing all deals. |
| `sale-25` | Closing 8-Figure Government Sovereign Cloud Tender | 5 (Crisis) | Regulatory Compliance, High-Stakes Diplomacy | Strict regulatory defense with cabinet-level officials. |

---

## 3. Data Contracts & Pydantic v2 Schemas

```python
class ScenarioDifficulty(IntEnum):
    FOUNDATIONAL = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    HIGH_STAKES = 4
    CRISIS_EXECUTIVE = 5

class ScenarioDefinitionSchema(BaseModel):
    id: str = Field(..., pattern=r"^[a-z0-9-]+$")
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$")
    track: Literal["leadership", "sales"]
    title: str = Field(..., min_length=5, max_length=150)
    topic: str = Field(..., min_length=3, max_length=100)
    difficulty: ScenarioDifficulty
    duration_limit_seconds: int = Field(default=600, ge=300, le=1800)
    turn_limit: int = Field(default=25, ge=10, le=50)
    target_capabilities: List[str] = Field(..., min_length=2, max_length=5)
    brief: str = Field(..., min_length=20)
    tactical_coaching_clue: str = Field(..., min_length=15)
    persona: PersonaSchema
    hidden_motivations: List[str] = Field(..., min_length=1)
    objections: List[str] = Field(..., min_length=1)
    curveballs: List[CurveballSchema] = Field(default_factory=list)
    success_criteria: List[str] = Field(..., min_length=2)
    skills_assessed: List[SkillAssessedSchema] = Field(..., min_length=2)
    opening_line: str = Field(..., min_length=5)
    tags: List[str] = Field(default_factory=list)
```

---

## 4. UI/UX Senior Accessibility Contract & 3H Brand Tokens

### 4.1 Design Tokens
- `brand-navy-primary`: `#0B192C` (Canvas / Root Background)
- `brand-navy-secondary`: `#1E3E62` (Cards, Panels, Header)
- `brand-navy-elevated`: `#244B77` (Hover states, Modals)
- `brand-accent-primary`: `#FF6500` (Buttons, Active Indicators, Clue Border)
- `brand-accent-hover`: `#E05A00`
- `brand-accent-gold`: `#F59E0B` (Tactical Clue highlights)
- `text-high-contrast`: `#FFFFFF` (100% pure white, ratio > 10:1 on Navy)
- `text-subtle-readable`: `#D1D5DB` (Light gray, ratio > 7:1 WCAG AAA)

### 4.2 Typography & Sizing Rules
- **Base body font**: Minimum 16px (`text-base`).
- **Dialogue transcript**: 18px (`text-lg`) with 1.6 line-height.
- **Tactical Coaching Clue**: High-contrast card with `#FF6500` amber border, `#132B45` surface, 16px font, with dedicated `#clue-expand-modal-btn` opening full-screen accessible modal for senior executives.

---

## 5. Error Matrix & Edge Case Handling

| Error Code | Trigger Condition | System Action | User-Facing Message |
|---|---|---|---|
| `ERR_PREMATURE_CONCLUSION` | Regex matches common conversational phrase prematurely | Keep session `active`; require explicit 2-way resolution | Counterpart responds in-character without closing session. |
| `ERR_TURN_LIMIT_EXCEEDED` | Turn count reaches 25 exchanges | Gracefully wrap conversation; trigger evaluation report | "We've reached our 25-exchange limit. Let's review the evaluation." |
| `ERR_VOICE_MIC_BLOCKED` | Browser blocks microphone permission | Fall back cleanly to text mode; display permission guide | "Microphone access blocked. Switched to high-contrast Text Mode." |
| `ERR_SCENARIO_SCHEMA` | YAML scenario fails Pydantic validation | Reject at boot time; log schema path and line | Startup health check fails with specific validation error. |

---

## 6. Acceptance Criteria

1. **Catalog**: 50 scenario YAML files exist in `backend/scenarios/` (25 leadership, 25 sales) and pass strict Pydantic v2 validation.
2. **Branding**: 3H Solutions logo renders in Navbar, Login, Briefing Modal, and PDF exports.
3. **Difficulty**: Levels 1-5 filterable and visually badged on cards, modal, and chat header.
4. **Senior Readability**: Tactical coaching clue is high-contrast (> 7:1) and expandable. Base font >= 16px.
5. **Execution**: Multi-turn chat functions seamlessly through 25 turns without premature cutoff. Pytest exits 0. Playwright E2E verifies full journey.
