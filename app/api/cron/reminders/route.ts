import { NextResponse } from "next/server";
import webpush from "web-push";
import { createDataClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY; const subject = process.env.VAPID_SUBJECT ?? "mailto:support@example.com";
  if (!publicKey || !privateKey) return NextResponse.json({ error: "VAPID is not configured" }, { status: 503 });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const db = createDataClient(); const subscriptions = await db.from("push_subscriptions").select("id,user_id,session_key,endpoint,p256dh,auth_key,timezone").limit(500); if (subscriptions.error) throw subscriptions.error;
  const now = new Date(); let sent = 0; let failed = 0;
  for (const subscription of subscriptions.data ?? []) {
    let reminderQuery = db.from("reminders").select("id,label,schedule_time,repeat_interval_minutes,created_at").eq("is_active", true);
    reminderQuery = subscription.user_id ? reminderQuery.eq("user_id", subscription.user_id) : reminderQuery.eq("session_key", subscription.session_key);
    const reminders = await reminderQuery; if (reminders.error) { failed += 1; continue; }
    const local = localParts(now, subscription.timezone);
    for (const reminder of reminders.data ?? []) {
      let deliveryKey: string | null = null;
      if (reminder.schedule_time?.slice(0, 5) === local.time) deliveryKey = `daily:${local.date}`;
      if (reminder.repeat_interval_minutes) deliveryKey = `interval:${Math.floor(now.getTime() / (reminder.repeat_interval_minutes * 60_000))}`;
      if (!deliveryKey) continue;
      const claimed = await db.from("notification_deliveries").insert({ reminder_id: reminder.id, push_subscription_id: subscription.id, delivery_key: deliveryKey }).select("id").maybeSingle();
      if (claimed.error || !claimed.data) continue;
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, JSON.stringify({ title: "Bluey reminder", body: reminder.label, tag: `reminder-${reminder.id}`, url: "/?view=reminders" }), { TTL: 300 });
        sent += 1;
      } catch (error) {
        failed += 1; await db.from("notification_deliveries").delete().eq("id", claimed.data.id);
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) await db.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }
  return NextResponse.json({ checked: subscriptions.data?.length ?? 0, sent, failed });
}
