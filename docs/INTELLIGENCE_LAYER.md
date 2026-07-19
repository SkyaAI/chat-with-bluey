# Intelligence Layer — Chat-with-Bluey

## Messy Inputs Bluey Receives
- "I have eggs and some leftover rice" → cooking suggestion
- "Remind me to take my pink pill at night" → structured reminder
- "I'm bored" → game selection
- Photo of fridge contents → ingredient detection + recipe
- "My knee hurts" → gentle exercise suggestions (low-impact)

## Auto-Structuring (server-side, before storing)
```json
{
  "intent": "cooking_suggestion",
  "entities": {
    "ingredients": ["eggs", "rice"]
  },
  "reminder_extract": null,
  "game_type": null,
  "confidence": 0.91,
  "source": "openai-gpt-4o"
}
```

## Events to Track
- `question_asked` — intent + input_mode + quota_remaining
- `reminder_created` — type + schedule
- `game_started` — game_type
- `quota_hit` — triggers paywall
- `payment_success` — unlocks unlimited

## Scoring Rules (v1 rule-based)
- Free quota: 5 questions/day per session_key
- Subscription check: `subscriptions.status = 'active'` → unlimited
- Reminder confidence < 0.7 → ask user to confirm time before saving

## What Gets Ranked / Suggested (v1 vs Later)
| Feature | v1 | Later |
|---|---|---|
| Cooking suggestion | AI reply to freetext | Personalised to dietary history |
| Game selection | Random from 3 types | Ranked by engagement history |
| Reminder nudge | User-set schedule | AI-inferred from chat patterns |
