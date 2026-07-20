import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { createDataClient } from "@/lib/supabase/admin";
import { readSessionKey } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const sessionKey = readSessionKey(request);
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const priceId = process.env.STRIPE_PRICE_MONTHLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
    if (!priceId || !priceId.startsWith("price_")) return NextResponse.json({ error: "Bluey’s subscription is not configured yet." }, { status: 503 });
    const db = createDataClient();
    const existing = await db.from("subscriptions").select("stripe_customer_id").eq("session_key", sessionKey).not("stripe_customer_id", "is", null).limit(1).maybeSingle();
    const session = await createCheckoutSession({ priceId, customerId: existing.data?.stripe_customer_id ?? undefined, sessionKey, successUrl: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${origin}/?checkout=canceled` });
    await db.from("audit_logs").insert({ event_type: "checkout_started", entity_type: "subscription", payload: { session_key: sessionKey.slice(0, 8), checkout_session_id: session.id } });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json({ error: "Checkout could not start. Please try again." }, { status: 500 });
  }
}
