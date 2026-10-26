"use client";
import { createElement, useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Aceternity `TextGenerateEffect`.
 *
 * Adapted so the component owns only the reveal animation: typography and
 * colour are inherited from the caller. Upstream hardcoded `text-2xl` plus its
 * own colour classes on an inner wrapper, which silently overrode whatever
 * display type scale the caller passed in — a display headline would render at
 * 24px. `as` also lets the caller make this the real page heading instead of a
 * decorative div.
 */
export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  as = "div",
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  /** Element that wraps the text. Use "h1" when this is the page title. */
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");

  useEffect(() => {
    animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration || 1,
        delay: stagger(0.2),
      }
    );
    // Runs once on mount; the scoped node is attached before effects fire.
  }, []);

  return createElement(
    as,
    { className: cn("font-bold", className) },
    <motion.span ref={scope}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={word + idx}
          className="opacity-0"
          style={{ filter: filter ? "blur(10px)" : "none" }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </motion.span>
  );
};
