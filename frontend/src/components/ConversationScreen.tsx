import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, VolumeX, Send } from "lucide-react";
import { fetchSimulateResponse } from "@/lib/api";
import type { Message, Context } from "@/lib/api";
import kintsugiShield from "@/assets/kintsugi-shield.png";

type SpeechRecognitionInstance = InstanceType<
  typeof globalThis.SpeechRecognition
>;



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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Detect STT support and initialise recognition
  useEffect(() => {
    const SpeechRecognition =
      globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSttSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try { recognition.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch { /* noop */ }
    setIsListening(false);
  }, []);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const canReveal = userMessageCount >= 2;

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening || isLoading) return;
    // Cancel any ongoing TTS to avoid audio overlap
    globalThis.speechSynthesis?.cancel();
    try { recognitionRef.current.start(); } catch { /* already started */ }
  }, [isListening, isLoading]);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !globalThis.speechSynthesis) return;

      globalThis.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = globalThis.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes("Google") || v.name.includes("Natural")
      );

      if (preferred) utterance.voice = preferred;

      globalThis.speechSynthesis.speak(utterance);
    },
    [voiceEnabled]
  );


  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const handleSend = async () => {
    // Stop STT before sending
    stopListening();

    // Prevent duplicate calls while loading
    if (isLoading) return;

    // Empty input protection with shake
    if (!input.trim()) {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
      return;
    }


    const userMsg: Message = { role: "user", text: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await fetchSimulateResponse(context, updatedMessages);
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
      speak(reply);
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
                className={`max-w-[78%] px-5 py-3.5 text-[13px] leading-relaxed ${msg.role === "user"
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
          <div className={`flex items-center gap-3 ${shakeInput ? "animate-shake" : ""}`}>
            <Input
              placeholder="Say what you're thinking…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={isLoading}
              className="flex-1 border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
            />
            {sttSupported && (
              <Button
                size="icon"
                variant="ghost"
                disabled={isLoading}
                className={`transition-colors ${isListening
                  ? "text-red-500 animate-pulse hover:text-red-400"
                  : "text-muted-foreground hover:text-primary"
                  }`}
                title={isListening ? "Listening…" : "Speak"}
                onClick={isListening ? stopListening : startListening}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            {globalThis.speechSynthesis && (
              <Button
                size="icon"
                variant="ghost"
                className={`transition-colors ${voiceEnabled
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
                  }`}
                title={voiceEnabled ? "Voice on" : "Voice off"}
                onClick={() => {
                  setVoiceEnabled((prev) => !prev);
                  globalThis.speechSynthesis.cancel();
                }}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            <Button
              variant="outline"
              disabled={!canReveal || isLoading}
              onClick={() => {
                stopListening();
                globalThis.speechSynthesis?.cancel();
                onRevealMirror();
              }}
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
