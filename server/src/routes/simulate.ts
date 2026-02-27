import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { chatCompletion } from "../lib/openrouter.js";
import { buildSimulateSystemPrompt } from "../prompts/simulateSystem.js";
import { applySafetyGuardrail } from "../lib/safety.js";

const router = Router();

const MessageSchema = z.object({
  role: z.enum(["user", "ai"]),
  text: z.string(),
});

const SimulateBodySchema = z.object({
  context: z.object({
    situation: z.string(),
    person: z.string(),
    emotion: z.string(),
  }),
  messages: z.array(MessageSchema),
});

// In-character fallbacks when the AI provider is unavailable
const FALLBACK_REPLIES = [
  "I... sorry, I zoned out for a second. Can you say that again?",
  "Look, I hear you, I just need a moment to think about what you said.",
  "Yeah... I'm not sure how to respond to that right now. Give me a second.",
  "I don't really know what to say to that. It's a lot.",
  "Sorry, I'm just... processing. This conversation is a lot right now.",
];

function getRandomFallback(): string {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = SimulateBodySchema.parse(req.body);
    const { context, messages } = body;

    // Generate dynamic system prompt based on user's context
    const systemContent = buildSimulateSystemPrompt(context);

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemContent },
    ];

    for (const msg of messages) {
      if (msg.role === "user") {
        const { message } = applySafetyGuardrail(msg.text);
        chatMessages.push({ role: "user", content: message });
      } else {
        chatMessages.push({ role: "assistant", content: msg.text });
      }
    }

    let reply: string;
    try {
      reply = await chatCompletion({
        messages: chatMessages,
        temperature: 0.85,
        max_tokens: 200,
      });
    } catch (llmErr) {
      // AI provider failed — use an in-character fallback so the conversation doesn't break
      console.warn("Simulate LLM failed, using in-character fallback:", llmErr);
      reply = getRandomFallback();
      res.json({ reply, isFallback: true });
      return;
    }

    res.json({ reply, isFallback: false });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request body", details: err.errors });
      return;
    }
    console.error("Error in /api/simulate:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
