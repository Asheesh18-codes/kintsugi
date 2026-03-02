import { useEffect, useRef, useCallback } from "react";

// ─── Demo Scenario ───────────────────────────────────────────────────────────
const DEMO_SCENARIO = {
  situation:
    "I am a team lead. One of my previously strong team members has started missing deadlines and using office time for personal projects. My client has lost trust in our delivery, and my manager has been having altercations with me about it. I need to address this directly but I also want to understand what's going on.",
  person: "Ravi",
  emotion: "frustrated",
};

const DEMO_MESSAGES = [
  "Ravi, I wanted to talk about the project timelines. The client has raised concerns and I need to understand what's happening.",
  "I hear you, and I'm not trying to corner you. But the deadlines keep slipping and I'm getting pressure from above. I need us to figure this out together.",
  "I care about your work here, Ravi. I'm asking because I want to help, not because I want to blame you.",
];

// ─── Timing ──────────────────────────────────────────────────────────────────
const TYPING_SPEED = 40; // ms per character
const PAUSE_BEFORE_SEND = 800;
const PAUSE_AFTER_AI_REPLY = 2500;
const PAUSE_BEFORE_MIRROR = 2000;
const ENTRY_FILL_DELAY = 1500;
const ENTRY_BEGIN_DELAY = 1200;

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAutoDemo() {
  const isAutoDemo = window.location.search.includes("autodemo");
  const demoPhaseRef = useRef<string>("idle");

  // Typewriter: types text into an input element character by character
  const typeInto = useCallback(
    (
      el: HTMLInputElement | HTMLTextAreaElement,
      text: string,
      onDone: () => void
    ) => {
      let i = 0;
      const nativeInputValueSetter =
        el.tagName === "TEXTAREA"
          ? Object.getOwnPropertyDescriptor(
              HTMLTextAreaElement.prototype,
              "value"
            )?.set
          : Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value"
            )?.set;

      const interval = setInterval(() => {
        if (i <= text.length) {
          nativeInputValueSetter?.call(el, text.slice(0, i));
          el.dispatchEvent(new Event("input", { bubbles: true }));
          i++;
        } else {
          clearInterval(interval);
          onDone();
        }
      }, TYPING_SPEED);

      return () => clearInterval(interval);
    },
    []
  );

  return { isAutoDemo, demoPhaseRef, typeInto, DEMO_SCENARIO, DEMO_MESSAGES };
}

// ─── Auto-fill entry form ────────────────────────────────────────────────────
export function useAutoDemoEntry(
  isAutoDemo: boolean,
  onBegin: (data: { situation: string; person: string; emotion: string }) => void
) {
  const filledRef = useRef(false);

  useEffect(() => {
    if (!isAutoDemo || filledRef.current) return;
    filledRef.current = true;

    const timer = setTimeout(() => {
      // Type situation
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
      if (!textarea) return;

      const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      let i = 0;
      const situationText = DEMO_SCENARIO.situation;
      const typeSituation = setInterval(() => {
        if (i <= situationText.length) {
          nativeTextAreaSetter?.call(textarea, situationText.slice(0, i));
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          i++;
        } else {
          clearInterval(typeSituation);

          // Type person name
          setTimeout(() => {
            const personInput = document.querySelector(
              'input[placeholder*="Who"]'
            ) as HTMLInputElement;
            if (!personInput) return;

            const nativeInputSetter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value"
            )?.set;

            let j = 0;
            const personText = DEMO_SCENARIO.person;
            const typePerson = setInterval(() => {
              if (j <= personText.length) {
                nativeInputSetter?.call(personInput, personText.slice(0, j));
                personInput.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                j++;
              } else {
                clearInterval(typePerson);

                // Click emotion selector and pick "Frustrated"
                setTimeout(() => {
                  const selectTrigger = document.querySelector(
                    '[role="combobox"]'
                  ) as HTMLElement;
                  if (selectTrigger) {
                    selectTrigger.click();

                    setTimeout(() => {
                      const options = document.querySelectorAll('[role="option"]');
                      const frustrated = Array.from(options).find(
                        (el) => el.textContent?.trim() === "Frustrated"
                      ) as HTMLElement;
                      if (frustrated) {
                        frustrated.click();
                      }

                      // Click Begin
                      setTimeout(() => {
                        onBegin(DEMO_SCENARIO);
                      }, ENTRY_BEGIN_DELAY);
                    }, 500);
                  }
                }, 600);
              }
            }, TYPING_SPEED);
          }, 400);
        }
      }, TYPING_SPEED);
    }, ENTRY_FILL_DELAY);

    return () => clearTimeout(timer);
  }, [isAutoDemo, onBegin]);
}

// ─── Auto-send conversation messages ─────────────────────────────────────────
export function useAutoDemoConversation(
  isAutoDemo: boolean,
  messages: { role: string; text: string }[],
  isLoading: boolean,
  onRevealMirror: () => void,
  inputRef: React.RefObject<HTMLInputElement | null>
) {
  const messageIndexRef = useRef(0);
  const typingRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isAutoDemo || isLoading || typingRef.current) return;

    const idx = messageIndexRef.current;

    // Wait for AI reply before sending next message
    // messages starts with 1 AI message, then user+AI pairs
    // After each user send, wait for AI reply (messages.length increases)
    const expectedLength = 1 + idx * 2; // AI greeting + (user+AI) pairs
    if (messages.length < expectedLength) return;

    // We've sent all demo messages -> go to mirror
    if (idx >= DEMO_MESSAGES.length) {
      if (!startedRef.current) {
        startedRef.current = true;
        setTimeout(() => {
          onRevealMirror();
        }, PAUSE_BEFORE_MIRROR);
      }
      return;
    }

    // We need an AI reply first (except for first message which has AI greeting)
    const hasAiReply = messages.length >= expectedLength;
    if (!hasAiReply) return;

    // Start typing the next user message
    typingRef.current = true;
    const delay = idx === 0 ? 1500 : PAUSE_AFTER_AI_REPLY;

    const timer = setTimeout(() => {
      const input = inputRef.current;
      if (!input) { typingRef.current = false; return; }

      const text = DEMO_MESSAGES[idx];
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;

      let c = 0;
      const typeInterval = setInterval(() => {
        if (c <= text.length) {
          nativeSetter?.call(input, text.slice(0, c));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          c++;
        } else {
          clearInterval(typeInterval);

          // Click send after a pause
          setTimeout(() => {
            const sendBtn = document.querySelector(
              'button[class*="bg-primary"]:not([disabled])'
            ) as HTMLElement;
            // OR find the send button by looking for the Send icon
            const allBtns = document.querySelectorAll("button");
            const sendButton = Array.from(allBtns).find(
              (btn) => btn.querySelector("svg") && btn.closest(".border-t")
            ) as HTMLElement;

            if (sendButton) {
              sendButton.click();
            } else if (sendBtn) {
              sendBtn.click();
            } else {
              // Fallback: dispatch Enter key
              input.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "Enter",
                  code: "Enter",
                  bubbles: true,
                })
              );
            }

            messageIndexRef.current = idx + 1;
            typingRef.current = false;
          }, PAUSE_BEFORE_SEND);
        }
      }, TYPING_SPEED);
    }, delay);

    return () => clearTimeout(timer);
  }, [isAutoDemo, messages.length, isLoading, onRevealMirror, inputRef]);
}
