"use client";

/**
 * Shared animated aurora-glass background.
 * `subtle` dials it down for dense screens like the dashboard.
 */
export default function Aurora({ subtle = false }: { subtle?: boolean }) {
  return (
    <>
      <div className={`na-aurora ${subtle ? "na-aurora-subtle" : ""}`} aria-hidden />
      <div className="na-grid" aria-hidden />
      <style>{`
        .na-aurora {
          position: fixed;
          inset: -45%;
          z-index: 0;
          pointer-events: none;
          filter: blur(72px);
          opacity: 0.6;
          background:
            radial-gradient(38% 38% at 22% 28%, #6366f1 0%, transparent 60%),
            radial-gradient(34% 34% at 80% 18%, #8b5cf6 0%, transparent 62%),
            radial-gradient(44% 44% at 64% 82%, rgba(217,70,239,0.55) 0%, transparent 62%),
            radial-gradient(40% 40% at 30% 74%, rgba(34,211,238,0.40) 0%, transparent 62%);
          animation: na-drift 18s ease-in-out infinite alternate;
        }
        .na-aurora-subtle { opacity: 0.28; filter: blur(90px); }
        @keyframes na-drift {
          from { transform: translate(-4%, -3%) rotate(0deg) scale(1.08); }
          to   { transform: translate(4%, 4%) rotate(12deg) scale(1.25); }
        }
        .na-grid {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, black 35%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, black 35%, transparent 100%);
        }
        @media (prefers-reduced-motion: reduce) { .na-aurora { animation: none; } }
      `}</style>
    </>
  );
}
