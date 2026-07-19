# Data Model — Chat-with-Bluey

## conversations
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | owner (null = demo/guest) |
| title | text | e.g. "What to cook today?" |
| created_at | timestamptz | |

## messages
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| conversation_id | uuid FK → conversations | |
| role | text | 'user' or 'assistant' |
| content | text | displayed text |
| input_mode | text | 'text', 'voice', 'image' |
| image_url | text nullable | ingredient photo |
| ai_reply | text | **AI field** |
| ai_reply_source | text | e.g. 'openai-gpt-4o' |
| ai_reply_confidence | numeric | 0–1 |
| ai_reply_review_status | text | 'unreviewed' default |
| created_at | timestamptz | |

## reminders
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| type | text | medication/water/toilet/stroll/custom |
| label | text | human-readable |
| schedule_time | time nullable | fixed daily time |
| repeat_interval_minutes | int nullable | e.g. 60 for hourly |
| is_active | boolean | |
| created_at | timestamptz | |

## daily_usage
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| session_key | text | anonymous device key |
| usage_date | date | |
| question_count | int | incremented each AI call |
| created_at | timestamptz | |

## subscriptions
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| status | text | active/inactive/cancelled/past_due |
| plan | text | 'monthly' |
| current_period_end | timestamptz | |
| created_at | timestamptz | |

## audit_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| event_type | text | e.g. 'quota_hit', 'payment_success' |
| entity_type | text | |
| entity_id | uuid | |
| payload | jsonb | |
| created_at | timestamptz | |

**RLS:** All tables have permissive v1 policies (select + all open). Lock-down sprint replaces with `auth.uid() = user_id`.
