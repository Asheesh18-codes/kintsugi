import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { chatCompletion } from "../lib/openrouter.js";
import { MIRROR_SYSTEM_PROMPT } from "../prompts/mirrorSystem.js";

const router = Router();

const MessageSchema = z.object({
  role: z.enum(["user", "ai"]),
  text: z.string(),
});

const MirrorBodySchema = z.object({
  context: z.object({
    situation: z.string(),
    person: z.string(),
    emotion: z.string(),
  }),
  messages: z.array(MessageSchema).min(2),
});

const MirrorResponseSchema = z.object({
  moment_to_notice: z.string(),
  the_other_side: z.string(),
  a_way_to_begin: z.string(),
});

// Safe fallback when AI returns unparseable output
const FALLBACK_REFLECTION = {
  trigger:
    "There may have been a moment in this conversation where something important went unspoken — a feeling that didn't quite find its words.",
  empathyGap:
    "From their perspective, this interaction may have carried more weight than it appeared on the surface.",
  repair:
    "I've been thinking about our last conversation, and I realize there might be something I didn't fully hear. Can we try again?",
};

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = MirrorBodySchema.parse(req.body);
    const { context, messages } = body;

    const transcript = messages
      .map((m) => `${m.role === "user" ? "Manager" : "Employee"}: ${m.text}`)
      .join("\n\n");

    const userContent =
      `CONTEXT:\n` +
      `The manager described their situation as: "${context.situation}". ` +
      `They are speaking with ${context.person}. ` +
      `They said they feel ${context.emotion}.\n\n` +
      `CONVERSATION TRANSCRIPT:\n\n${transcript}\n\n` +
      `Analyze this conversation. Return only valid JSON.`;

    let raw: string;
    try {
      raw = await chatCompletion({
        messages: [
          { role: "system", content: MIRROR_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
    } catch (llmErr) {
      console.error("Mirror LLM failed:", llmErr);
      throw llmErr;
    }

    // Strip markdown code fences if present
    let jsonStr = raw;
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    // Stability guard: fallback to safe reflection if parsing fails
    let mirrorData;
    try {
      const parsed = JSON.parse(jsonStr);
      mirrorData = MirrorResponseSchema.parse(parsed);
    } catch (parseErr) {
      console.error("Mirror JSON parse failed:", parseErr);
      throw parseErr;
    }

    // Map to frontend's expected keys
    res.json({
      trigger: mirrorData.moment_to_notice,
      empathyGap: mirrorData.the_other_side,
      repair: mirrorData.a_way_to_begin,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request body", details: err.errors });
      return;
    }
    console.error("Error in /api/mirror:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
