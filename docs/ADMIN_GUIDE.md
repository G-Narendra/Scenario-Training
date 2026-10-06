# Administrator & Training Lead Guide

## 1. Cohort Lifecycle Management
- **Creating a Cohort**:
  - Set Cohort Name, Track Access (Sales, Leadership, or Both), and optional member limit.
  - The access window defaults to exactly 30 days from creation (`starts_at` to `expires_at`).
  - An initial cryptographically random passcode (e.g. `K7QM-4PXD`) is generated and shown once.
- **Passcode Rotation**:
  - Rotate passcodes at any time from the Admin Console.
  - Previous passcodes become instantly invalid for new logins. Existing active sessions remain valid until token expiry unless "Revoke active sessions" is checked.
- **Expiry Enforcement**:
  - At the end of 30 days, all API requests from cohort members are immediately rejected.
  - The admin can extend the expiration window if contract extensions are granted.

## 2. Managing Scenarios
- **Scenario Studio**:
  - Create new scenarios via visual form or the built-in YAML editor.
  - Live schema validation flags missing fields, invalid weights (weights must sum to 1.0), or missing curveballs before saving.
  - "Test this scenario": Launches an interactive preview session without recording analytics.
  - Publishing: Scenarios are saved as Drafts until explicitly published. Every edit creates an immutable record in `scenario_versions`.

## 3. Cohort Analytics & Progress Tracking
- View completion rates, average scores per skill, and most frequently failed scenarios across the training group.
- Drill down into individual trainees to review session transcripts and feedback reports.
- Export aggregated cohort performance data as CSV.

## 4. Manual cURL Walkthrough (Verification)
```bash
# 1. Health check
curl -s http://localhost:8000/health

# 2. Login with passcode
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"passcode": "DEMO-2026", "display_name": "Sarah Admin"}'

# 3. Retrieve available scenarios
curl -s http://localhost:8000/api/scenarios \
  -H "Authorization: Bearer <TOKEN>"
```
