"use client";

/**
 * Living animated mesh-gradient backdrop for the landing page.
 * Big blurred color blobs drift + a fine grain overlay for texture —
 * replaces the flat near-black look.
 */
export default function MeshBackground() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div className="mb-blob mb-1" />
      <div className="mb-blob mb-2" />
      <div className="mb-blob mb-3" />
      <div className="mb-blob mb-4" />
      <div className="mb-grain" />
      <div className="mb-grid" />
      <style>{`
        .mb-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.5; mix-blend-mode: screen; }
        .mb-1 { width: 620px; height: 620px; top: -180px; left: -120px;
          background: radial-gradient(circle, #6366f1, transparent 65%); animation: mb-f1 22s ease-in-out infinite alternate; }
        .mb-2 { width: 560px; height: 560px; top: -100px; right: -100px;
          background: radial-gradient(circle, #8b5cf6, transparent 65%); animation: mb-f2 26s ease-in-out infinite alternate; }
        .mb-3 { width: 520px; height: 520px; bottom: -160px; left: 20%;
          background: radial-gradient(circle, #d946ef, transparent 65%); opacity: 0.35; animation: mb-f3 30s ease-in-out infinite alternate; }
        .mb-4 { width: 480px; height: 480px; top: 40%; right: 8%;
          background: radial-gradient(circle, #22d3ee, transparent 65%); opacity: 0.28; animation: mb-f4 24s ease-in-out infinite alternate; }
        @keyframes mb-f1 { to { transform: translate(120px, 90px) scale(1.2); } }
        @keyframes mb-f2 { to { transform: translate(-100px, 120px) scale(1.15); } }
        @keyframes mb-f3 { to { transform: translate(140px, -80px) scale(1.25); } }
        @keyframes mb-f4 { to { transform: translate(-90px, -110px) scale(1.18); } }
        .mb-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%);
        }
        .mb-grain {
          position: absolute; inset: 0; opacity: 0.04; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        @media (prefers-reduced-motion: reduce) { .mb-blob { animation: none !important; } }
      `}</style>
    </div>
  );
}
