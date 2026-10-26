"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

/**
 * Aceternity `AuroraBackground`, retuned to the SAMPRAAN palette.
 *
 * Every colour is inlined in the style object, so the component has no
 * dependency on host theme variables. The brand band runs saffron → amber →
 * navy → teal: an aurora that still reads as institutional, not decorative.
 */
export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)]",
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={
          {
            "--aurora":
              "repeating-linear-gradient(100deg,#e66a0a_10%,#f5c98a_15%,#2f6fd0_22%,#12a3a6_28%,#f08c1e_34%)",
            "--dark-gradient":
              "repeating-linear-gradient(100deg,#0b1526_0%,#0b1526_7%,transparent_10%,transparent_12%,#0b1526_16%)",
            "--white-gradient":
              "repeating-linear-gradient(100deg,#ffffff_0%,#ffffff_7%,transparent_10%,transparent_12%,#ffffff_16%)",
            "--black": "#0b1526",
            "--white": "#ffffff",
            "--transparent": "transparent",
          } as React.CSSProperties
        }
      >
        <div
          className={cn(
            "after:animate-aurora pointer-events-none absolute -inset-[10px] blur-[10px] will-change-transform",
            "[background-image:var(--white-gradient),var(--aurora)] [background-size:300%,_200%] [background-position:50%_50%,50%_50%]",
            "opacity-[0.42] invert filter",
            "after:absolute after:inset-0 after:content-[''] after:animate-aurora",
            "after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:[background-attachment:fixed] after:mix-blend-difference",
            "dark:opacity-[0.38] dark:invert-0 dark:[background-image:var(--dark-gradient),var(--aurora)] after:dark:[background-image:var(--dark-gradient),var(--aurora)]",
            showRadialGradient &&
              "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]"
          )}
        />
      </div>
      {children}
    </div>
  );
};
