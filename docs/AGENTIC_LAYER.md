# Agentic Layer — Chat-with-Bluey

## Risk Levels & Actions

### Low — Auto-executed (no approval needed)
- Generate AI cooking suggestion from ingredients
- Generate word/memory game for user
- Tag message intent (cooking/reminder/game/exercise)
- Increment daily question count

### Medium — Confirm before acting
- **Create reminder** from chat: show parsed details ("Save reminder: blood pressure pill at 8am daily?") → user taps Confirm
- **Update reminder** schedule from chat

### High — Explicit user action required
- **Initiate Stripe Checkout** — user must tap "Subscribe" button; never auto-charge
- **Send push notification** — requires browser permission grant

### Critical — Human only
- Refund a payment (Stripe dashboard, not the app)
- Delete all user data
- Any medical advice escalation

## Named Tools (v1)
| Tool | Risk | Description |
|---|---|---|
| `generate_reply` | Low | Call OpenAI, store result |
| `extract_reminder` | Low | Parse reminder from message |
| `save_reminder` | Medium | Insert reminder after user confirms |
| `check_quota` | Low | Read daily_usage, return remaining |
| `create_checkout_session` | High | Server-side Stripe API call |
| `mark_subscription_active` | High | Webhook only, not user-callable |

## Audit Log Fields
`event_type`, `entity_type`, `entity_id`, `user_id`, `payload` (intent, confidence, stripe_event_id), `created_at`

## v1 vs Later
- **v1:** All above tools
- **Later:** `send_carer_alert`, `log_step_count`, `schedule_exercise_program`
