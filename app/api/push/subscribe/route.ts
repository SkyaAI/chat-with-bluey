import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/auth";
import { readSessionKey } from "@/lib/session";

type SubscriptionBody = { endpoint?: string; keys?: { p256dh?: string; auth?: string }; timezone?: string };

function validTimezone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SubscriptionBody;
    const endpoint = body.endpoint?.trim(); const p256dh = body.keys?.p256dh?.trim(); const authKey = body.keys?.auth?.trim(); const timezone = body.timezone?.trim() || "UTC";
    if (!endpoint?.startsWith("https://") || endpoint.length > 2000 || !p256dh || !authKey || !validTimezone(timezone)) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    const userId = await currentUserId(); const sessionKey = readSessionKey(request); const db = createDataClient();
    const saved = await db.from("push_subscriptions").upsert({ endpoint, p256dh, auth_key: authKey, timezone, user_id: userId, session_key: sessionKey, updated_at: new Date().toISOString() }, { onConflict: "endpoint" }).select("id").single();
    if (saved.error) throw saved.error;
    return NextResponse.json({ enabled: true });
  } catch (error) { console.error("[push/subscribe]", error); return NextResponse.json({ error: "Notifications could not be enabled." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { endpoint?: string }; const endpoint = body.endpoint?.trim(); if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
    const userId = await currentUserId(); const sessionKey = readSessionKey(request); const db = createDataClient(); let query = db.from("push_subscriptions").delete().eq("endpoint", endpoint); query = userId ? query.eq("user_id", userId) : query.eq("session_key", sessionKey); const removed = await query; if (removed.error) throw removed.error;
    return NextResponse.json({ enabled: false });
  } catch (error) { console.error("[push/unsubscribe]", error); return NextResponse.json({ error: "Notifications could not be disabled." }, { status: 500 }); }
}
