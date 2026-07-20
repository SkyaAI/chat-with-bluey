type InputMode = "text" | "voice" | "image";

function friendlyFallback(content: string, inputMode: InputMode) {
  const text = content.toLowerCase();
  if (inputMode === "image") return "I can help with that photo. Tell me which ingredients you recognise, and we can turn them into a simple meal together.";
  if (/egg|rice|banana|oat|cook|meal|food/.test(text)) return "Let’s keep it simple and tasty. Combine what you have in one pan, cook it gently, and add a little salt or your favourite herbs. Tell me your ingredients and I’ll give you exact steps.";
  if (/pill|medicine|remind/.test(text)) return "I can help you remember that. Open Reminders and add the medicine name and time so Bluey can keep it safe for you.";
  if (/bored|game|play/.test(text)) return "Let’s play! Open Games for a quick word-memory or matching game. You can take your time—there is no rush.";
  return "I’m here with you. Could you tell me a little more, and I’ll help one small step at a time?";
}

export async function generateBlueyReply(content: string, inputMode: InputMode, imageData?: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { text: friendlyFallback(content, inputMode), source: "bluey-offline", confidence: 0.72 };

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: content }];
  if (imageData && /^data:image\/(png|jpeg|webp);base64,/.test(imageData)) {
    userContent.push({ type: "image_url", image_url: { url: imageData } });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        temperature: 0.4,
        max_tokens: 350,
        messages: [
          { role: "system", content: "You are Bluey, a warm and concise daily companion for adults aged 60+. Use plain language, short steps, and never claim a reminder was saved unless the app confirms it. Do not diagnose medical problems." },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned an empty reply");
    return { text, source: process.env.OPENAI_MODEL ?? "gpt-4o", confidence: 0.9 };
  } finally { clearTimeout(timeout); }
}
