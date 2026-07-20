import Stripe from "stripe";

/**
 * Stripe client.
 *
 * Works in two modes — controlled entirely by env vars, no code changes needed:
 *
 * STANDALONE (your own Stripe account):
 *   STRIPE_SECRET_KEY = sk_live_xxx   (your secret key)
 *   STRIPE_CONNECT_ACCOUNT_ID not set
 *   STRIPE_PLATFORM_FEE_PERCENT not set
 *
 * PLATFORM (provisioned through Vibe Launchpad — platform takes a cut):
 *   STRIPE_SECRET_KEY = sk_live_xxx   (platform's key OR your connected account key)
 *   STRIPE_CONNECT_ACCOUNT_ID = acct_xxx   (your connected Stripe account)
 *   STRIPE_PLATFORM_FEE_PERCENT = 1   (platform takes 1% of every transaction)
 */
// Fall back to a placeholder so `new Stripe()` doesn't throw at build time
// when STRIPE_SECRET_KEY isn't configured. Real Stripe calls still require a
// valid key at runtime — this only keeps `next build` from crashing while
// collecting page data for projects that don't use Stripe.
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

// Set when this app was provisioned through a Connect platform
export const CONNECT_ACCOUNT_ID = process.env.STRIPE_CONNECT_ACCOUNT_ID as
  | string
  | undefined;

// Platform fee percentage (0–100). Only active when CONNECT_ACCOUNT_ID is set.
export const PLATFORM_FEE_PERCENT = CONNECT_ACCOUNT_ID
  ? Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? "0")
  : 0;

// Pass this to Stripe API calls when running through a Connect platform
export const stripeAccountOptions = (): Stripe.RequestOptions | undefined =>
  CONNECT_ACCOUNT_ID ? { stripeAccount: CONNECT_ACCOUNT_ID } : undefined;

// ─── Checkout ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession({
  priceId,
  customerId,
  sessionKey,
  successUrl,
  cancelUrl,
  mode = "subscription",
}: {
  priceId: string;
  customerId?: string;
  sessionKey: string;
  successUrl: string;
  cancelUrl: string;
  mode?: "payment" | "subscription";
}) {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: sessionKey,
    metadata: { session_key: sessionKey },
    ...(customerId
      ? { customer: customerId }
      : { customer_creation: "always" }),

    // Subscription platform fee
    ...(mode === "subscription" && PLATFORM_FEE_PERCENT > 0
      ? {
          subscription_data: {
            metadata: { session_key: sessionKey },
            application_fee_percent: PLATFORM_FEE_PERCENT,
          },
        }
      : mode === "subscription"
      ? { subscription_data: { metadata: { session_key: sessionKey } } }
      : {}),

    // One-time payment platform fee — calculated after price lookup
    // (handled in checkout route where we have the amount)
  };

  return getStripe().checkout.sessions.create(params, stripeAccountOptions());
}

// ─── Billing portal ───────────────────────────────────────────────────────────

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return getStripe().billingPortal.sessions.create(
    { customer: customerId, return_url: returnUrl },
    stripeAccountOptions(),
  );
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export function constructWebhookEvent(payload: string, signature: string) {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );
}
