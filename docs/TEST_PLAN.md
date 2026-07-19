# Test Plan — Chat-with-Bluey

## Core Success Scenario (manual)
1. Open app on mobile browser — chat list loads with 3 demo conversations. ✓
2. Tap "What to cook today?" — messages load, AI reply visible. ✓
3. Type "I have bananas and oats, what can I make?" → tap Send. ✓
4. Spinner shows → AI reply appears within 5s → row in `messages` with `role=assistant`. ✓
5. Ask 4 more questions → on 6th, paywall modal appears. ✓
6. Tap "Subscribe" → Stripe Checkout page opens (test card 4242 4242 4242 4242). ✓
7. Complete payment → redirected back → 7th question succeeds. ✓
8. Check Supabase: `subscriptions.status = 'active'`, `audit_logs` has `payment_success`. ✓

## Reminder Tests
- Add medication reminder ("Metformin", 09:00) → appears in list. ✓
- Edit label → change saved on refresh. ✓
- Delete reminder → gone from list and DB. ✓
- Empty state: no reminders → shows "Add your first reminder" prompt. ✓

## Empty & Error States
- No internet → send message → error toast: "Bluey can't connect right now. Try again."
- OpenAI timeout (>10s) → error toast; user message row saved, assistant row NOT created (no ghost row).
- Invalid Stripe webhook signature → 400 returned; subscription NOT updated.
- 6th question with no subscription → paywall modal, question NOT counted. ✓

## Voice & Image (Sprint 3)
- Tap mic → speak "What can I cook with rice?" → transcribed text appears in input box → send → AI reply. ✓
- Upload fridge photo → AI replies with ingredient-based recipe. ✓
- Upload non-food image → AI replies gracefully: "I can see that's not food — tell me what ingredients you have!"

## Games
- Tap Games → three options shown. ✓
- Word Memory: 5 words shown → timer → input → score displayed. ✓
- Empty game result: 0 words → encouraging message shown, not a blank screen. ✓
