import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Send } from "lucide-react";
import { fetchSimulateResponse } from "@/lib/api";
import type { Message, Context } from "@/lib/api";
import kintsugiShield from "@/assets/kintsugi-shield.png";

const MAX_EXCHANGES = 3;

interface ConversationScreenProps {
  context: Context;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onRevealMirror: () => void;
}

const ConversationScreen = ({
  context,
  messages,
  setMessages,
  onRevealMirror,
}: ConversationScreenProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const canReveal = userMessageCount >= 2;
  const reachedLimit = userMessageCount >= MAX_EXCHANGES;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const handleSend = async () => {
    // Prevent duplicate calls while loading
    if (isLoading) return;

    // Empty input protection with shake
    if (!input.trim()) {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
      return;
    }

    // Conversation limit reached
    if (reachedLimit) return;

    const userMsg: Message = { role: "user", text: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await fetchSimulateResponse(context, updatedMessages);
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex min-h-screen flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center border-b border-border px-6 py-3">
        <img
          src={kintsugiShield}
          alt="Kintsugi"
          className="h-7 w-7 object-contain"
        />
        <h2 className="flex-1 text-center font-heading text-base tracking-[0.15em] text-foreground">
          Practice Space
        </h2>
        <div className="w-7" />
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-8 sm:px-8"
      >
        <div className="mx-auto max-w-2xl space-y-5">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] px-5 py-3.5 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-[16px_16px_4px_16px] bg-surface-2 text-secondary-foreground"
                    : "rounded-[16px_16px_16px_4px] border border-primary/10 bg-primary/[0.04] text-foreground"
                }`}
              >
                {msg.role === "ai" && (
                  <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-primary/60">
                    Kintsugi
                  </span>
                )}
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[78%] px-5 py-3.5 rounded-[16px_16px_16px_4px] border border-primary/10 bg-primary/[0.04]">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-primary/60">
                  Kintsugi
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground italic">
                  thinking
                  <span className="inline-flex gap-0.5">
                    <span className="animate-bounce [animation-delay:0ms] h-1 w-1 rounded-full bg-muted-foreground/50" />
                    <span className="animate-bounce [animation-delay:150ms] h-1 w-1 rounded-full bg-muted-foreground/50" />
                    <span className="animate-bounce [animation-delay:300ms] h-1 w-1 rounded-full bg-muted-foreground/50" />
                  </span>
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {reachedLimit && !isLoading ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-[12px] italic text-primary/70"
            >
              When you're ready, let's look beneath the surface.
            </motion.p>
          ) : (
            <div className={`flex items-center gap-3 ${shakeInput ? "animate-shake" : ""}`}>
              <Input
                placeholder="Say what you're thinking…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={isLoading || reachedLimit}
                className="flex-1 border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
              />
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-primary"
                title="Voice input (coming soon)"
                disabled
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || reachedLimit}
                size="icon"
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-col items-center gap-2.5">
            <Button
              variant="outline"
              disabled={!canReveal || isLoading}
              onClick={onRevealMirror}
              className="border-primary/20 font-mono text-[11px] uppercase tracking-[0.2em] text-primary transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_0_20px_hsl(43_65%_52%/0.2)] disabled:opacity-20 disabled:hover:shadow-none"
            >
              Pause and Look Beneath the Surface
            </Button>
            <p className="text-[11px] text-muted-foreground">
              This space reflects, never judges. When you're ready, look deeper.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConversationScreen;
