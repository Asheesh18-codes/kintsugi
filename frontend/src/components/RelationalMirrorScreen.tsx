import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import GoldGlow from "@/components/GoldGlow";
import { fetchMirrorAnalysis } from "@/lib/api";
import type { Message, Context, MirrorData } from "@/lib/api";

interface RelationalMirrorScreenProps {
  context: Context;
  messages: Message[];
  onTryAgain: () => void;
  onStartNew: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.25, duration: 0.6, ease: "easeOut" as const },
  }),
};

const RelationalMirrorScreen = ({
  context,
  messages,
  onTryAgain,
  onStartNew,
}: RelationalMirrorScreenProps) => {
  const [mirrorData, setMirrorData] = useState<MirrorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMirror = async () => {
      setIsLoading(true);
      setIsFallback(false);

      const result = await fetchMirrorAnalysis(context, messages);

      if (!cancelled) {
        setMirrorData(result.data);
        setIsFallback(result.isFallback);
        setIsLoading(false);
      }
    };

    loadMirror();

    return () => {
      cancelled = true;
    };
  }, [context, messages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      className="relative flex min-h-screen items-center justify-center bg-mirror-gradient px-4 py-16"
    >
      {/* Background glow */}
      <GoldGlow className="bottom-[20%] left-1/2 h-[300px] w-[600px] -translate-x-1/2" />

      <div className="relative z-10 w-full max-w-lg space-y-8 text-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-primary">
            What Lies Beneath
          </p>
          <h1 className="font-heading text-4xl font-light tracking-wide text-foreground sm:text-5xl">
            Your Reflection
          </h1>
          <div className="gold-divider mx-auto mt-5 w-16" />
        </motion.div>

        {/* Fallback indicator */}
        {isFallback && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-sm bg-primary/10 border border-primary/20 px-4 py-2.5"
          >
            <p className="text-[11px] font-mono tracking-wider text-primary/80">
              ⚡ Practice mode — showing a guided reflection while AI is unavailable
            </p>
          </motion.div>
        )}

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-sm bg-surface p-6 animate-pulse">
                <div className="h-3 w-24 bg-muted-foreground/20 rounded mb-3" />
                <div className="h-3 w-full bg-muted-foreground/10 rounded mb-2" />
                <div className="h-3 w-3/4 bg-muted-foreground/10 rounded" />
              </div>
            ))}
            <p className="text-[11px] italic text-muted-foreground/60">
              Let's pause here. Sometimes reflection takes a moment.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Trigger Card */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-sm border-l-2 border-trigger/60 bg-surface p-6 text-left glow-trigger"
            >
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-trigger">
                ⚠ A Moment to Notice
              </p>
              <p className="text-[13px] italic leading-relaxed text-muted-foreground">
                {mirrorData?.trigger}
              </p>
            </motion.div>

            {/* Empathy Gap Card */}
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-sm border-l-2 border-empathy/60 bg-surface p-6 text-left glow-empathy"
            >
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-empathy">
                △ The Other Side
              </p>
              <p className="text-[13px] italic leading-relaxed text-muted-foreground">
                {mirrorData?.empathyGap}
              </p>
            </motion.div>

            {/* Repair Card */}
            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-sm border border-repair/40 bg-surface p-6 text-left animate-glow-pulse-card"
            >
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-repair">
                ✦ A Way to Begin
              </p>
              <p className="text-[13px] leading-relaxed text-foreground">
                "{mirrorData?.repair}"
              </p>
            </motion.div>
          </>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isLoading ? 0 : 1.3, duration: 0.5 }}
          className="flex flex-col items-center gap-3 pt-6"
        >
          <Button
            onClick={onTryAgain}
            disabled={isLoading}
            size="lg"
            className="w-full max-w-xs bg-primary font-mono text-[11px] uppercase tracking-[0.2em] text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_25px_hsl(43_65%_52%/0.4)]"
          >
            Rehearse Again
          </Button>
          <Button
            variant="outline"
            onClick={onStartNew}
            disabled={isLoading}
            size="lg"
            className="w-full max-w-xs border-border font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Begin a New Conversation
          </Button>
          <p className="mt-4 max-w-xs text-[11px] italic leading-relaxed text-muted-foreground/60">
            The cracks are where the light gets in.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default RelationalMirrorScreen;
