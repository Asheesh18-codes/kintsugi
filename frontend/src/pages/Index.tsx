import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import EntryScreen from "@/components/EntryScreen";
import ConversationScreen from "@/components/ConversationScreen";
import RelationalMirrorScreen from "@/components/RelationalMirrorScreen";
import GrainOverlay from "@/components/GrainOverlay";
import type { Message, Context } from "@/lib/api";

type Screen = "entry" | "conversation" | "mirror";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("entry");
  const [context, setContext] = useState<Context>({
    situation: "",
    person: "",
    emotion: "",
  });
  const [messages, setMessages] = useState<Message[]>([]);

  const handleBegin = (data: Context) => {
    setContext(data);
    setMessages([
      {
        role: "ai",
        text: `I'm glad you're here. You're preparing to talk with ${data.person}, and you mentioned feeling ${data.emotion}. Take your time — say what you'd want to say to them, in your own words.`,
      },
    ]);
    setScreen("conversation");
  };

  return (
    <div className="min-h-screen bg-background">
      <GrainOverlay />
      <AnimatePresence mode="wait">
        {screen === "entry" && (
          <EntryScreen key="entry" onBegin={handleBegin} />
        )}
        {screen === "conversation" && (
          <ConversationScreen
            key="conversation"
            context={context}
            messages={messages}
            setMessages={setMessages}
            onRevealMirror={() => setScreen("mirror")}
          />
        )}
        {screen === "mirror" && (
          <RelationalMirrorScreen
            key="mirror"
            context={context}
            messages={messages}
            onTryAgain={() => setScreen("conversation")}
            onStartNew={() => {
              setContext({ situation: "", person: "", emotion: "" });
              setMessages([]);
              setScreen("entry");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
