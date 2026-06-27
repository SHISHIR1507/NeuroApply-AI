"use client";

import { useEffect, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$!&*";

/* Scrambles a single string, revealing characters left-to-right.
   Returns raw text so it inherits parent gradient/color styles. */
export function useScramble(text: string, delay = 0, speed = 28) {
  const [output, setOutput] = useState(() =>
    text.split("").map(c => (c === " " ? " " : "█")).join("")
  );

  useEffect(() => {
    let revealed = 0;
    let frame = 0;
    let interval: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        frame++;
        if (frame % 3 === 0 && revealed < text.length) revealed++;

        const result = text
          .split("")
          .map((c, i) => {
            if (c === " ") return " ";
            if (i < revealed) return c;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");

        setOutput(result);
        if (revealed >= text.length) {
          clearInterval(interval);
          setOutput(text);
        }
      }, speed);
    }, delay);

    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [text, delay, speed]);

  return output;
}

/* Drop-in component version — wraps in a <span> */
export default function ScrambleText({
  text,
  delay = 0,
  speed = 28,
  style,
  className,
}: {
  text: string;
  delay?: number;
  speed?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const output = useScramble(text, delay, speed);
  return <span style={style} className={className}>{output}</span>;
}
