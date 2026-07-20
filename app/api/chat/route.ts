import { NextResponse } from "next/server";
import { createDataClient } from "@/lib/supabase/admin";
import { generateBlueyReply } from "@/lib/bluey";
import { readSessionKey } from "@/lib/session";
import { currentUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const sessionKey = readSessionKey(request);
    const userId = await currentUserId();
    const scope = userId ? `session_key.is.null,user_id.eq.${userId}` : `session_key.is.null,session_key.eq.${sessionKey}`;
    const db = createDataClient();
    const id = new URL(request.url).searchParams.get("conversationId");
    const [{ data: conversations, error: conversationError }, usageResult] = await Promise.all([
      db.from("conversations").select("id,title,created_at").or(scope).order("created_at", { ascending: true }),
      db.from("daily_usage").select("question_count").eq("session_key", sessionKey).eq("usage_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
    ]);
    if (conversationError) throw conversationError;
    let messages: unknown[] = [];
    if (id) {
      const result = await db.from("messages").select("id,conversation_id,role,content,input_mode,image_url,created_at").eq("conversation_id", id).or(scope).order("created_at");
      if (result.error) throw result.error;
      messages = result.data ?? [];
    }
    let subscriptionQuery = db.from("subscriptions").select("status").eq("status", "active");
    subscriptionQuery = userId ? subscriptionQuery.eq("user_id", userId) : subscriptionQuery.eq("session_key", sessionKey);
    const subscription = await subscriptionQuery.limit(1).maybeSingle();
    return NextResponse.json({ conversations: conversations ?? [], messages, used: usageResult.data?.question_count ?? 0, limit: 5, subscribed: Boolean(subscription.data) });
  } catch (error) {
    console.error("[chat/get]", error);
    return NextResponse.json({ error: "Bluey can’t connect right now. Try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let userMessageId: string | undefined;
  try {
    const sessionKey = readSessionKey(request);
    const userId = await currentUserId();
    const body = await request.json() as { conversationId?: string; content?: string; inputMode?: "text" | "voice" | "image"; imageData?: string };
    const content = body.content?.trim();
    if (!content || content.length > 2000) return NextResponse.json({ error: "Please enter a shorter question." }, { status: 400 });
    const inputMode = body.inputMode ?? "text";
    if (!["text", "voice", "image"].includes(inputMode)) return NextResponse.json({ error: "Unsupported input mode." }, { status: 400 });
    if (body.imageData && (!/^data:image\/(png|jpeg|webp);base64,/.test(body.imageData) || body.imageData.length > 3_500_000)) return NextResponse.json({ error: "Choose a PNG, JPG, or WebP photo smaller than 2.5 MB." }, { status: 400 });
    const db = createDataClient();

    let subscriptionQuery = db.from("subscriptions").select("status").eq("status", "active");
    subscriptionQuery = userId ? subscriptionQuery.eq("user_id", userId) : subscriptionQuery.eq("session_key", sessionKey);
    const subscription = await subscriptionQuery.limit(1).maybeSingle();
    let quotaData = { allowed: true, count: 0 };
    if (!subscription.data) {
      const quota = await db.rpc("consume_guest_question", { p_session_key: sessionKey, p_limit: 5 });
      if (quota.error) throw quota.error;
      quotaData = quota.data as { allowed: boolean; count: number };
      if (userId) await db.from("daily_usage").update({ user_id: userId }).eq("session_key", sessionKey).eq("usage_date", new Date().toISOString().slice(0, 10));
    }
    if (!quotaData.allowed) {
      await db.from("audit_logs").insert({ user_id: userId, event_type: "quota_hit", entity_type: "daily_usage", payload: { session_key: sessionKey.slice(0, 8), question_count: quotaData.count } });
      return NextResponse.json({ paywall: true, used: quotaData.count, limit: 5 }, { status: 402 });
    }

    let conversationId = body.conversationId;
    if (!conversationId) {
      const created = await db.from("conversations").insert({ title: content.slice(0, 42), session_key: sessionKey, user_id: userId }).select("id").single();
      if (created.error) throw created.error;
      conversationId = created.data.id;
    }
    const savedUser = await db.from("messages").insert({ conversation_id: conversationId, role: "user", content, input_mode: inputMode, image_url: body.imageData ? "inline-image" : null, session_key: sessionKey, user_id: userId }).select("id").single();
    if (savedUser.error) throw savedUser.error;
    userMessageId = savedUser.data.id;

    const reply = await generateBlueyReply(content, inputMode, body.imageData);
    await db.from("messages").update({ ai_reply: reply.text, ai_reply_source: reply.source, ai_reply_confidence: reply.confidence }).eq("id", userMessageId);
    const savedAssistant = await db.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: reply.text, input_mode: "text", session_key: sessionKey, user_id: userId }).select("id,conversation_id,role,content,input_mode,image_url,created_at").single();
    if (savedAssistant.error) throw savedAssistant.error;
    await db.from("audit_logs").insert({ user_id: userId, event_type: "question_asked", entity_type: "message", entity_id: userMessageId, payload: { input_mode: inputMode, quota_remaining: Math.max(0, 5 - quotaData.count), source: reply.source } });
    return NextResponse.json({ conversationId, message: savedAssistant.data, used: quotaData.count, limit: 5, subscribed: Boolean(subscription.data) });
  } catch (error) {
    console.error("[chat/post]", error);
    return NextResponse.json({ error: userMessageId ? "Your question was saved, but Bluey couldn’t reply. Try again." : "Bluey can’t connect right now. Try again." }, { status: 500 });
  }
}
