const MIN_INPUT_LENGTH = 10;

const SAFETY_PREFIX =
  "The user's message was very brief. Stay in character as the employee. " +
  "Respond with mild confusion or a gentle prompt for them to elaborate, " +
  "like a real person who didn't quite catch what was said. Keep it natural.";

export function applySafetyGuardrail(userMessage: string): {
  message: string;
  guardrailApplied: boolean;
} {
  const trimmed = userMessage.trim();
  if (trimmed.length < MIN_INPUT_LENGTH) {
    return {
      message: `[SAFETY NOTE: ${SAFETY_PREFIX}]\n\nUser said: "${trimmed}"`,
      guardrailApplied: true,
    };
  }
  return { message: trimmed, guardrailApplied: false };
}
