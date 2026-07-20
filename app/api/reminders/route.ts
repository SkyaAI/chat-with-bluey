import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/admin";
import { readSessionKey } from "@/lib/session";

const allowedTypes = new Set(["medication", "water", "toilet", "stroll", "custom"]);
function clean(body: Record<string, unknown>) {
  const type = String(body.type ?? "custom"); const label = String(body.label ?? "").trim();
  const time = body.schedule_time ? String(body.schedule_time) : null;
  const interval = body.repeat_interval_minutes ? Number(body.repeat_interval_minutes) : null;
  if (!allowedTypes.has(type) || !label || label.length > 120) throw new Error("Invalid reminder");
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Invalid time");
  if (interval !== null && (!Number.isInteger(interval) || interval < 15 || interval > 1440)) throw new Error("Invalid interval");
  return { type, label, schedule_time: time, repeat_interval_minutes: interval, is_active: body.is_active !== false };
}

export async function GET(request: Request) {
  try { const key = readSessionKey(request); const db = createDataClient(); const result = await db.from("reminders").select("id,type,label,schedule_time,repeat_interval_minutes,is_active,created_at,session_key").or(`session_key.is.null,session_key.eq.${key}`).order("created_at"); if (result.error) throw result.error; return NextResponse.json({ reminders: result.data ?? [] }); }
  catch (error) { console.error("[reminders/get]", error); return NextResponse.json({ error: "Reminders could not load." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try { const key = readSessionKey(request); const values = clean(await request.json()); const db = createDataClient(); const result = await db.from("reminders").insert({ ...values, session_key: key }).select("*").single(); if (result.error) throw result.error; await db.from("audit_logs").insert({ event_type: "reminder_created", entity_type: "reminder", entity_id: result.data.id, payload: { type: values.type, schedule_time: values.schedule_time } }); return NextResponse.json({ reminder: result.data }, { status: 201 }); }
  catch (error) { console.error("[reminders/post]", error); return NextResponse.json({ error: "Please check the reminder details." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try { const key = readSessionKey(request); const body = await request.json() as Record<string, unknown>; const id = String(body.id ?? ""); const values = clean(body); const db = createDataClient(); const result = await db.from("reminders").update(values).eq("id", id).eq("session_key", key).select("*").single(); if (result.error) throw result.error; await db.from("audit_logs").insert({ event_type: "reminder_updated", entity_type: "reminder", entity_id: result.data.id, payload: { type: values.type } }); return NextResponse.json({ reminder: result.data }); }
  catch (error) { console.error("[reminders/patch]", error); return NextResponse.json({ error: "Reminder could not be updated." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try { const key = readSessionKey(request); const id = new URL(request.url).searchParams.get("id"); if (!id) throw new Error("Missing id"); const db = createDataClient(); const result = await db.from("reminders").delete().eq("id", id).eq("session_key", key).select("id").single(); if (result.error) throw result.error; await db.from("audit_logs").insert({ event_type: "reminder_deleted", entity_type: "reminder", entity_id: result.data.id }); return NextResponse.json({ deleted: true }); }
  catch (error) { console.error("[reminders/delete]", error); return NextResponse.json({ error: "Reminder could not be deleted." }, { status: 400 }); }
}
