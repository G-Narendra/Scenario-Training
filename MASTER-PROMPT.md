# Social insights master prompt

Execute this prompt to rebuild and polish the Social Insights platform. Follow every architectural constraint, design standard, and writing guideline specified below.

---

## 1. Project identity and core requirements

Social Insights is an open source social listening and tiered intelligence platform. It collects brand mentions across public sources, runs cost-controlled NLP and LLM processing, and presents reputation telemetry in an executive dashboard.

### Operational constraints
1. **Container memory limit**: The backend must stay below 512 MB RAM to run on Render free instances. Run `LOW_MEMORY_MODE = true` by default, using heuristic classifiers and remote LLM inference instead of loading heavy transformer weights into local memory.
2. **Inference cost cap**: Keep inference cost below $0.0001 per mention by using a 4-tier processing funnel.
3. **Multi-source ingestion**: Support concurrent ingestion from Google News RSS, Hacker News Algolia API, Wikipedia revisions, GitHub commits and issues, Stack Exchange API, Reddit public feeds, and YouTube endpoints.
4. **Data cleanliness**: Reject spam, affiliate links, and duplicate content using NFKC normalization, URL tracking parameter stripping, xxHash64 exact hashing, and Jaccard 3-gram text similarity.
5. **Access control**: Provide role-based access control for Administrators, Market Analysts, and Executive Viewers. Include 1-click evaluation personas on the login screen.

---

## 2. Visual overhaul and frontend design system

The existing frontend interface looks unpolished. Replace it with a modern, high-contrast, data-dense interface built with Next.js 14 App Router, Tailwind CSS, Lucide icons, and Recharts.

### Design tokens and styling guidelines
1. **Palette**:
   - Background: Dark slate canvas (`#0b0f19`) with nested surface layers (`#111827`, `#1f2937`).
   - Accent colors: Electric indigo (`#6366f1`) for primary actions, emerald (`#10b981`) for positive sentiment, amber (`#f59e0b`) for neutral sentiment, and rose (`#f43f5e`) for negative sentiment.
   - Borders: Subtle hairline borders (`border-white/10`) with low-opacity backdrop blurs (`backdrop-blur-md`).
2. **Typography**:
   - Use clean sans-serif typography (Inter or Plus Jakarta Sans).
   - Set crisp hierarchy: sentence case section labels, numeric metrics in monospace or tabular figures, and concise descriptions.
3. **Data visualization**:
   - Recharts components must feature custom SVG tooltips, subtle gridlines, and responsive layout containers.
   - Avoid default browser colors. Every chart line, bar, and pie segment must map directly to project theme tokens.
4. **Layout structure**:
   - Top bar: Project logo, active tracked keyword selector, role switcher badge, live connection status indicator.
   - Metric ribbon: Net Sentiment Score (-100 to +100), Brand Health Index (0 to 100), total mentions processed, and rejection rate.
   - Tabs: Overview, Mentions Feed, AI Synthesis, Competitor Benchmark, and System Telemetry.
   - Anomaly banner: Visible notification card for volume surges or sentiment drops, with acknowledge and dismiss controls.

---

## 3. Human engineering and communication standards

All code, inline comments, commit messages, documentation, and user-facing text must follow the Wikipedia anti-AI writing guidelines. Activate the utility skill at `skills/utilities/humanize/human-engineering-standards.yaml` for every task.

### Writing constraints
1. **Punctuation**: Never use em dashes. Use commas, parentheses, colons, or periods instead.
2. **List counts**: Avoid the rule of three. Do not write triplet lists. Use two or four items instead.
3. **Tone**: Maintain a direct and neutral engineering tone. Remove conversational greetings, sign-offs, emojis, and assistant disclaimers.
4. **Headings**: Use sentence case for all headings. Avoid excessive bolding within lists.
5. **Vocabulary filters**:
   - Ban inflated claims such as groundbreaking, transformative, pivotal, seamless, and cutting-edge.
   - Replace complex verbs such as serves as, underscores, and utilizes with is, shows, and uses.
   - Avoid marketing adjectives such as vibrant, breathtaking, and astonishing.
   - Eliminate trailing participial phrases such as highlighting its importance or ensuring optimal efficiency.
   - Ban negative parallelism formulas such as not only X but also Y or it is not just X, it is Y.
6. **Code comments**: Write comments only when explaining non-obvious algorithms, race conditions, hardware limits, or edge-case handling. Never write comments that merely repeat what the code does.
7. **Commit messages**: Use conventional commit syntax in imperative sentence case (for example, `feat(ingest): add hackernews pagination limit`).

---

## 4. Architectural specifications

### Ingestion and cleaning engine (`backend/`)
- **FastAPI 0.115+**: Async route handlers with Pydantic v2 schemas and non-blocking I/O.
- **Normalization pipeline**:
  - Run NFKC Unicode normalization on all raw titles and snippets.
  - Strip UTM queries, click IDs (`fbclid`, `gclid`), and fragment identifiers from mention URLs.
  - Calculate xxHash64 hash over normalized body text to drop exact duplicates immediately.
  - Run 3-gram Jaccard comparison (threshold 0.85) against recent mentions in the collection window to drop near-duplicates.
  - Apply word-boundary regex checks against context hints to eliminate substring false positives.
  - Drop records under 30 characters or containing promotional spam tokens.

### Tiered intelligence funnel
- **Tier 0 (Fast heuristics)**: Lexical rule classifier with negation handling and 8 topic regex centroids. Zero memory overhead.
- **Tier 1 (Local embeddings, optional)**: SentenceTransformers `all-MiniLM-L6-v2` topic cosine matching and CardiffNLP RoBERTa sentiment. Disable automatically when `LOW_MEMORY_MODE = true`.
- **Tier 2 (Frontier LLM)**: Call NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct` or compatible endpoint) over batches of high-confidence mentions to extract key pain points, feature requests, and leadership summaries.
- **Tier 3 (Deterministic fallback)**: Structured markdown template generator that produces executive summaries using calculated metrics if LLM keys are absent or rate-limited.

### Role-based access control (RBAC)
- **Roles**:
  - `Admin`: Full permissions, including brand deletion, system configuration, and data purging.
  - `Analyst`: Data collection trigger, AI insight refresh, and anomaly alert resolution.
  - `Viewer`: Read-only access to dashboards, charts, and intelligence briefings.
- **Demo personas**: Pre-seed `admin@socialinsights.io`, `analyst@socialinsights.io`, and `viewer@socialinsights.io` with 1-click login buttons.

---

## 5. Execution phases and role assignments

Follow this structured sequence to inspect, rebuild, and verify the platform.

### Phase 1: Audit and planning
- **Assigned skills**: `roles/product/requirements-analyst/`, `roles/engineering/backend-architect/`
- Review the current workspace files, package configurations, database migrations, and environment variables.
- Ensure `skills/` is included in `.gitignore` on day 0 to prevent committing private instructions to remote repositories.
- Verify that `LOW_MEMORY_MODE = true` is respected across all worker routines.

### Phase 2: Design system and frontend rebuild
- **Assigned skills**: `roles/design/product-designer-ui/`, `roles/engineering/frontend-design/`, `roles/engineering/ui-ux-pro-max/`
- Build reusable UI primitives: `Card`, `Badge`, `Button`, `Modal`, `Table`, `MetricStat`, and `AlertBanner`.
- Build the top navigation with instant demo persona switching and brand keyword selection.
- Implement responsive Recharts visualizations for sentiment trends, topic distribution, and source share.
- Build the mentions table with live filtering by sentiment, topic, source, and search terms.
- Style the AI summary panel with copyable markdown blocks and structured takeaway cards.

### Phase 3: Backend ingestion and data pipeline
- **Assigned skills**: `roles/engineering/senior-fullstack/`, `roles/data/data-engineer/`
- Audit and refine all 7 ingestion scrapers (`hackernews.py`, `googlenews.py`, `wikipedia.py`, `github.py`, `stackexchange.py`, `reddit.py`, `youtube.py`).
- Implement async task workers using FastAPI background tasks to prevent request timeouts.
- Verify xxHash64 and Jaccard deduplication logic with automated test cases.

### Phase 4: Intelligence engine and memory tuning
- **Assigned skills**: `roles/ai/machine-learning-engineer/`, `roles/engineering/performance-engineer/`
- Implement the fallback hierarchy: Tier 0 -> Tier 1 -> Tier 2 -> Tier 3.
- Enforce `TORCH_NUM_THREADS = 1` and redirect cache directories to `/tmp` to support non-root container users.
- Verify container memory footprint remains under 100 MB during active benchmark runs.

### Phase 5: RBAC and security verification
- **Assigned skills**: `roles/security/security-engineer/`, `roles/engineering/senior-fullstack/`
- Enforce JWT authentication with standard library PBKDF2-HMAC-SHA256 password hashing.
- Protect mutation endpoints with role requirement dependencies.
- Add CORS middleware restricted to local development ports and production Vercel domains.

### Phase 6: Automated testing and quality assurance
- **Assigned skills**: `roles/qa/qa-automation-engineer/`, `roles/engineering/accessibility-engineer/`
- Write unit tests for deduplication, sentiment heuristics, and topic assignment.
- Write API integration tests for authentication, mention queries, and statistics calculation.
- Run lighthouse and accessibility audits to confirm WCAG AA contrast and full keyboard navigation.

### Phase 7: Deployment configuration and documentation
- **Assigned skills**: `roles/devops/devops-engineer/`, `roles/product/documentation-specialist/`
- Validate `Dockerfile` and `docker-compose.yml` for multi-stage production builds.
- Prepare Render and Vercel configuration files.
- Write comprehensive `README.md` and API specifications in sentence case without marketing hyperbole.

---

## 6. MCP usage and safety rules

1. **Free-tier preservation**: Never push commits to GitHub, execute cloud deployments, or trigger paid API calls without explicit user approval.
2. **Local execution first**: Run all tests, linting, formatting, and builds in the local development environment.
3. **Zero placeholders**: Write fully functional implementations with real error handlers and typed parameters. Do not leave placeholder comments or mock stubs in production routes.
