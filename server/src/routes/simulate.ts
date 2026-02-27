import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { chatCompletion } from "../lib/openrouter.js";
import { SIMULATE_SYSTEM_PROMPT } from "../prompts/simulateSystem.js";
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


router.post("/", async (req: Request, res: Response) => {
  try {
    const body = SimulateBodySchema.parse(req.body);
    const { context, messages } = body;

    const systemContent =
      SIMULATE_SYSTEM_PROMPT +
      `\n\nContext about this specific conversation:\n` +
      `The user is a team lead speaking to an employee.\n` +
      `Situation: ${context.situation}\n` +
      `The person they are speaking with: ${context.person}\n` +
      `The manager is currently feeling: ${context.emotion}\n\n` +
      `Respond as the employee.\n` +
      `Stay emotionally grounded and realistic.\n` +
      `Do not solve the issue.\n` +
      `Keep tension subtle but present.`;

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
      console.error("Simulate LLM failed:", llmErr);
      throw llmErr;
    }

    res.json({ reply });
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
