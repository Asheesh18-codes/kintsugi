const GoldGlow = ({ className = "" }: { className?: string }) => (
  <div
    className={`pointer-events-none absolute rounded-full animate-pulse-glow ${className}`}
    style={{
      background:
        "radial-gradient(circle, hsl(43 65% 52% / 0.08) 0%, transparent 70%)",
    }}
  />
);

export default GoldGlow;
