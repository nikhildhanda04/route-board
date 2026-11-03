"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/*
  The reading animation: a line settles onto the page rather than arriving.
  Same easing as the chart's write-in, so the page has one motion character —
  fast out of the gate, long settle, no bounce. Reduced motion gets the fade
  only; nothing on the page depends on movement to be legible.
*/
const EASE = [0.16, 1, 0.3, 1] as const;

export default function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  /** The element to animate. Grid and list children must animate as
      themselves — a wrapper div would break the chart's cell rules. */
  as = "div",
  cells = false,
}: {
  children: ReactNode;
  /** Seconds. Use small steps (0.06–0.1) to stagger a group. */
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "article" | "li" | "section";
  /** Hold the chart's write-in until this block is actually looked at. A
      sheet below the fold would otherwise finish writing itself unseen. */
  cells?: boolean;
}) {
  const reduce = useReducedMotion();
  const [seen, setSeen] = useState(false);
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      data-cells={cells ? String(seen) : undefined}
      onViewportEnter={cells ? () => setSeen(true) : undefined}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -6% 0px" }}
      transition={{ duration: reduce ? 0.3 : 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}
