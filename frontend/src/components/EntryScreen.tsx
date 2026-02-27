import { useState } from "react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GoldGlow from "@/components/GoldGlow";
import kintsugiShield from "@/assets/kintsugi-shield.png";

interface EntryScreenProps {
  onBegin: (data: { situation: string; person: string; emotion: string }) => void;
}

const emotionalStates = [
  "Calm", "Frustrated", "Concerned", "Anxious", "Uncertain",
  "Angry", "Guilty", "Disappointed", "Scared", "Sad",
  "Overwhelmed", "Hopeful",
];

const EntryScreen = ({ onBegin }: EntryScreenProps) => {
  const [situation, setSituation] = useState("");
  const [person, setPerson] = useState("");
  const [emotion, setEmotion] = useState("");

  const canSubmit = situation.trim() && person.trim() && emotion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex min-h-screen items-center justify-center bg-hero-gradient px-4"
    >
      {/* Background glow */}
      <GoldGlow className="left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-md space-y-10 text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex flex-col items-center gap-5"
        >
          <img
            src={kintsugiShield}
            alt="Kintsugi — cracked gold shield"
            className="h-24 w-24 object-contain animate-float"
          />
          <h1 className="text-shimmer font-heading text-5xl font-light tracking-wide sm:text-6xl">
            Kintsugi
          </h1>
          <p className="font-heading text-lg italic text-primary">
            A quiet place to practice what matters.
          </p>
        </motion.div>

        {/* Gold divider */}
        <div className="gold-divider mx-auto w-16" />

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground"
        >
          Before the real conversation, let yourself think here first.
        </motion.p>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="space-y-4 text-left"
        >
          <Textarea
            placeholder="What's weighing on you?"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="min-h-[110px] resize-none border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
          />
          <Input
            placeholder="Who is this conversation with?"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
          />
          <Select value={emotion} onValueChange={setEmotion}>
            <SelectTrigger className="border-border bg-surface text-foreground">
              <SelectValue placeholder="How are you feeling right now?" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-foreground">
              {emotionalStates.map((state) => (
                <SelectItem key={state} value={state.toLowerCase()}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="space-y-4"
        >
          <Button
            onClick={() => onBegin({ situation, person, emotion })}
            disabled={!canSubmit}
            size="lg"
            className="group relative w-full overflow-hidden bg-primary text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_25px_hsl(43_65%_52%/0.4)] disabled:opacity-30"
          >
            <span className="relative z-10 font-mono text-xs uppercase tracking-[0.2em]">
              Begin When You're Ready
            </span>
          </Button>
          <p className="text-[11px] tracking-wider text-muted-foreground">
            Nothing you share here leaves this space.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EntryScreen;
