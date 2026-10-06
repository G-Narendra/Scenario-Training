# Cost Model & Budget Controls

## 1. Unit Economics & Assumptions

### 1.1 Text Roleplay Session (15-20 turns, ~10 minutes)
- **Input tokens per turn**: ~500 tokens (system prompt, persona, transcript history)
- **Output tokens per turn**: ~60 tokens (counterpart responses are concise 1-3 sentences)
- **Total session tokens**: ~10,000 input tokens, ~1,200 output tokens
- **Evaluator call**: ~3,000 input tokens, ~800 output tokens
- **Estimated Cost (Claude 3.5 Sonnet / GPT-4o)**:
  - Input: $0.003 / 1k tokens $\times$ 13k = $0.039
  - Output: $0.015 / 1k tokens $\times$ 2k = $0.030
  - **Total per Text Session**: ~$0.07 USD

### 1.2 Voice Roleplay Session (10 minutes live audio)
- **Realtime API (e.g. OpenAI Realtime)**:
  - Audio Input: $0.06 / min $\times$ 5 min trainee speech = $0.30
  - Audio Output: $0.24 / min $\times$ 5 min counterpart speech = $1.20
  - Evaluator text report: ~$0.07
  - **Total per Realtime Voice Session**: ~$1.57 USD
- **Fallback Streaming STT + LLM + TTS**:
  - Whisper STT: $0.006 / min $\times$ 5 min = $0.03
  - LLM Text Chat: ~$0.07
  - ElevenLabs / OpenAI TTS: $0.015 / 1k chars $\times$ ~6k chars = $0.09
  - Evaluator text report: ~$0.07
  - **Total per Fallback Voice Session**: ~$0.26 USD

## 2. Hard Cost Safeguards
1. **Per-Session Limits**:
   - Max 4,000 generated tokens per text session.
   - Max 15 minutes live audio per voice session.
2. **Per-Cohort Budget Cap**:
   - Default $100.00 USD monthly limit per cohort.
   - Usage events recorded for every LLM and audio call.
   - Automated cutoff when cohort reaches 100% of budget cap.
