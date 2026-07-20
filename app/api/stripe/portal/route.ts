import { createDataClient } from "@/lib/supabase/admin";
import { createPortalSession } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { readSessionKey } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const userId = await currentUserId();
    const sessionKey = readSessionKey(request);
    const db = createDataClient();
    let customerQuery = db.from("subscriptions").select("stripe_customer_id").not("stripe_customer_id", "is", null);
    customerQuery = userId ? customerQuery.eq("user_id", userId) : customerQuery.eq("session_key", sessionKey);
    const { data: subscription, error } = await customerQuery.limit(1).maybeSingle();
    if (error) throw error;
    if (!subscription?.stripe_customer_id) return NextResponse.json({ error: "No billing account found. Subscribe first." }, { status: 404 });
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const portalSession = await createPortalSession({ customerId: subscription.stripe_customer_id, returnUrl: origin || "/" });
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[stripe/portal]", error);
    return NextResponse.json({ error: "Billing portal could not open." }, { status: 500 });
  }
}
