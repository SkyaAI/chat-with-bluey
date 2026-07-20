import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/stripe";
import { createDataClient } from "@/lib/supabase/admin";

function mapStatus(value: Stripe.Subscription.Status) {
  if (value === "active" || value === "trialing") return "active";
  if (value === "past_due" || value === "unpaid") return "past_due";
  return "cancelled";
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  let event: Stripe.Event;
  try { event = constructWebhookEvent(await request.text(), signature); }
  catch (error) { console.error("[stripe/webhook] invalid signature", error); return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  try {
    const db = createDataClient();
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const sub = event.data.object as Stripe.Subscription; const key = sub.metadata.session_key; const userId = sub.metadata.user_id || null;
      if (key) {
        const values = { session_key: key, user_id: userId, stripe_customer_id: String(sub.customer), stripe_subscription_id: sub.id, status: event.type === "customer.subscription.deleted" ? "cancelled" : mapStatus(sub.status), plan: "monthly", current_period_end: new Date(sub.current_period_end * 1000).toISOString() };
        const saved = await db.from("subscriptions").upsert(values, { onConflict: "stripe_subscription_id" }); if (saved.error) throw saved.error;
        if (values.status === "active") await db.from("audit_logs").insert({ user_id: userId, event_type: "payment_success", entity_type: "subscription", payload: { session_key: key.slice(0, 8), stripe_event_id: event.id } });
      }
    }
    if (event.type === "checkout.session.completed") { const session = event.data.object as Stripe.Checkout.Session; const key = session.metadata?.session_key; const userId = session.metadata?.user_id; if (key && session.customer) { let query = db.from("subscriptions").update({ stripe_customer_id: String(session.customer), user_id: userId || null }); query = userId ? query.eq("user_id", userId) : query.eq("session_key", key); const updated = await query; if (updated.error) throw updated.error; } }
    return NextResponse.json({ received: true });
  } catch (error) { console.error(`[stripe/webhook] ${event.type}`, error); return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 }); }
}
