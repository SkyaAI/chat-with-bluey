import { NextResponse } from "next/server";
import { generateBlueyReply } from "@/lib/bluey";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

const conversationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { db, user } = await requireAuthenticatedUser();
    const id = new URL(request.url).searchParams.get("conversationId");
    if (id && !conversationIdPattern.test(id)) {
      return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
    }

    const [{ data: conversations, error: conversationError }, usageResult, subscription] = await Promise.all([
      db.from("conversations").select("id,title,created_at").eq("user_id", user.id).order("created_at", { ascending: true }),
      db.from("daily_usage").select("question_count").eq("user_id", user.id).eq("usage_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
      db.from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
    ]);
    if (conversationError) throw conversationError;
    if (usageResult.error) throw usageResult.error;
    if (subscription.error) throw subscription.error;

    let messages: unknown[] = [];
    if (id) {
      const ownedConversation = await db
        .from("conversations")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (ownedConversation.error) throw ownedConversation.error;
      if (!ownedConversation.data) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }

      const result = await db
        .from("messages")
        .select("id,conversation_id,role,content,input_mode,image_url,created_at")
        .eq("conversation_id", id)
        .eq("user_id", user.id)
        .order("created_at");
      if (result.error) throw result.error;
      messages = result.data ?? [];
    }

    return NextResponse.json({
      conversations: conversations ?? [],
      messages,
      used: usageResult.data?.question_count ?? 0,
      limit: 5,
      subscribed: Boolean(subscription.data),
    });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error("[chat/get]", error);
    return NextResponse.json({ error: "Bluey can't connect right now. Try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let userMessageId: string | undefined;
  let createdConversationId: string | undefined;
  try {
    const { db, user } = await requireAuthenticatedUser();
    const body = await request.json() as {
      conversationId?: string;
      content?: string;
      inputMode?: "text" | "voice" | "image";
      imageData?: string;
    };
    const content = body.content?.trim();
    if (!content || content.length > 2000) {
      return NextResponse.json({ error: "Please enter a shorter question." }, { status: 400 });
    }
    const inputMode = body.inputMode ?? "text";
    if (!["text", "voice", "image"].includes(inputMode)) {
      return NextResponse.json({ error: "Unsupported input mode." }, { status: 400 });
    }
    if (body.imageData && (!/^data:image\/(png|jpeg|webp);base64,/.test(body.imageData) || body.imageData.length > 3_500_000)) {
      return NextResponse.json({ error: "Choose a PNG, JPG, or WebP photo smaller than 2.5 MB." }, { status: 400 });
    }
    if (body.conversationId && !conversationIdPattern.test(body.conversationId)) {
      return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
    }

    let conversationId = body.conversationId;
    if (conversationId) {
      const ownedConversation = await db
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (ownedConversation.error) throw ownedConversation.error;
      if (!ownedConversation.data) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }
    }

    const subscription = await db
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (subscription.error) throw subscription.error;

    let quotaData = { allowed: true, count: 0 };
    if (!subscription.data) {
      const quota = await db.rpc("consume_question");
      if (quota.error) throw quota.error;
      quotaData = quota.data as { allowed: boolean; count: number };
    }
    if (!quotaData.allowed) {
      return NextResponse.json({ paywall: true, used: quotaData.count, limit: 5 }, { status: 402 });
    }

    if (!conversationId) {
      const created = await db
        .from("conversations")
        .insert({ title: content.slice(0, 42), user_id: user.id })
        .select("id")
        .single();
      if (created.error) throw created.error;
      conversationId = created.data.id;
      createdConversationId = conversationId;
    }

    const savedUser = await db
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content,
        input_mode: inputMode,
        image_url: body.imageData ? "inline-image" : null,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (savedUser.error) {
      if (createdConversationId) {
        await db.from("conversations").delete().eq("id", createdConversationId).eq("user_id", user.id);
      }
      throw savedUser.error;
    }
    userMessageId = savedUser.data.id;

    const reply = await generateBlueyReply(content, inputMode, body.imageData);
    const updatedUser = await db
      .from("messages")
      .update({
        ai_reply: reply.text,
        ai_reply_source: reply.source,
        ai_reply_confidence: reply.confidence,
      })
      .eq("id", userMessageId)
      .eq("user_id", user.id);
    if (updatedUser.error) throw updatedUser.error;

    const savedAssistant = await db
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply.text,
        input_mode: "text",
        user_id: user.id,
      })
      .select("id,conversation_id,role,content,input_mode,image_url,created_at")
      .single();
    if (savedAssistant.error) throw savedAssistant.error;

    return NextResponse.json({
      conversationId,
      message: savedAssistant.data,
      used: quotaData.count,
      limit: 5,
      subscribed: Boolean(subscription.data),
    });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error("[chat/post]", error);
    return NextResponse.json(
      { error: userMessageId ? "Your question was saved, but Bluey couldn't reply. Try again." : "Bluey can't connect right now. Try again." },
      { status: 500 },
    );
  }
}
