"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { display: "<2s",  countTo: 2,    suffix: "s",   prefix: "<", label: "Average fill time",     isNum: true  },
  { display: "6",    countTo: 6,    suffix: "",    prefix: "",  label: "Resolution layers",      isNum: true  },
  { display: "1ms",  countTo: 1,    suffix: "ms",  prefix: "",  label: "Cached field latency",   isNum: true  },
  { display: "100%", countTo: 100,  suffix: "%",   prefix: "",  label: "Easy Apply compatible",  isNum: true  },
];

function CountUp({ to, suffix, prefix, active }: { to: number; suffix: string; prefix: string; active: boolean }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active) return;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, to]);

  return <span>{prefix}{val}{suffix}</span>;
}

export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: "80px 24px 80px",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            style={{
              padding: "36px 32px",
              background: "rgba(255,255,255,0.015)",
              textAlign: "center",
              borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Subtle amber glow on hover */}
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at center, rgba(245,158,11,0.04) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              lineHeight: 1, marginBottom: 8,
            }}>
              <CountUp to={s.countTo} suffix={s.suffix} prefix={s.prefix} active={inView} />
            </div>
            <div style={{ fontSize: 13, color: "#52525b", fontWeight: 500 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
