import { NextResponse } from "next/server";
import { generateBlueyReply } from "@/lib/bluey";
import { readSessionKey } from "@/lib/session";
import { createDataClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/auth";

const games = new Set(["word-memory", "memory-match", "walk-challenge"]);
export async function POST(request: Request) {
  try {
    const sessionKey = readSessionKey(request); const userId = await currentUserId(); const body = await request.json() as { gameType?: string; action?: string; score?: number; steps?: number };
    const gameType = body.gameType ?? ""; if (!games.has(gameType)) return NextResponse.json({ error: "Unknown game." }, { status: 400 });
    const db = createDataClient();
    if (body.action === "start") {
      let words = ["apple", "garden", "yellow", "music", "river"];
      if (gameType === "word-memory" && process.env.OPENAI_API_KEY) {
        const reply = await generateBlueyReply("Give exactly five simple, unrelated memory-game words separated only by commas.", "text");
        const parsed = reply.text.toLowerCase().split(/[,\n]/).map((word) => word.replace(/[^a-z -]/g, "").trim()).filter(Boolean).slice(0, 5);
        if (parsed.length === 5) words = parsed;
      }
      await db.from("audit_logs").insert({ user_id: userId, event_type: "game_started", entity_type: "game", payload: { game_type: gameType, session_key: sessionKey.slice(0, 8) } });
      return NextResponse.json({ words });
    }
    await db.from("audit_logs").insert({ user_id: userId, event_type: "game_completed", entity_type: "game", payload: { game_type: gameType, score: body.score ?? null, steps: body.steps ?? null, session_key: sessionKey.slice(0, 8) } });
    return NextResponse.json({ saved: true });
  } catch (error) { console.error("[games]", error); return NextResponse.json({ error: "Game progress could not be saved." }, { status: 500 }); }
}
