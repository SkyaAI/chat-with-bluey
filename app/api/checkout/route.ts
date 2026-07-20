import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { createDataClient } from "@/lib/supabase/admin";
import { readSessionKey } from "@/lib/session";
import { currentUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const sessionKey = readSessionKey(request);
    const userId = await currentUserId();
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const priceId = process.env.STRIPE_PRICE_MONTHLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
    if (!priceId || !priceId.startsWith("price_")) return NextResponse.json({ error: "Bluey’s subscription is not configured yet." }, { status: 503 });
    const db = createDataClient();
    let existingQuery = db.from("subscriptions").select("stripe_customer_id").not("stripe_customer_id", "is", null);
    existingQuery = userId ? existingQuery.eq("user_id", userId) : existingQuery.eq("session_key", sessionKey);
    const existing = await existingQuery.limit(1).maybeSingle();
    const session = await createCheckoutSession({ priceId, customerId: existing.data?.stripe_customer_id ?? undefined, sessionKey, userId, successUrl: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${origin}/?checkout=canceled` });
    await db.from("audit_logs").insert({ user_id: userId, event_type: "checkout_started", entity_type: "subscription", payload: { session_key: sessionKey.slice(0, 8), checkout_session_id: session.id } });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json({ error: "Checkout could not start. Please try again." }, { status: 500 });
  }
}
