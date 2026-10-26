/* SAMPRAAN — shared brand + interaction primitives.
 *
 * These were previously declared inside the Home page component, which forced
 * the landing page to either duplicate them or reach into another page's
 * module. They live here so every surface renders the identical wordmark,
 * status vocabulary, and control styling.
 */
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { truncateMid, type Tone } from "@/lib/sampraan";
import { Accessibility, Copy, Moon, Sun } from "lucide-react";

const signalTone: Record<Tone, string> = {
  mint: "mint",
  amber: "amber",
  red: "red",
  muted: "muted",
};

export function StatusPill({
  ok,
  warn,
  off,
  children,
  title,
}: {
  ok?: boolean;
  warn?: boolean;
  off?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  const cls = off ? "off" : warn ? "warn" : ok ? "ok" : "off";
  const glyph = ok ? "✓" : warn ? "⚠" : "✕";
  return (
    <span className={`status-pill ${cls}`} title={title} role="status">
      <span className="glyph" aria-hidden="true">
        {glyph}
      </span>
      {children}
    </span>
  );
}

export function CopyChip({
  value,
  label,
  full,
}: {
  value: string | null | undefined;
  label?: string;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const display = full ? value : truncateMid(value, 10);
  return (
    <button
      type="button"
      className={`copy-chip ${copied ? "copied" : ""} ${full ? "copy-chip-full" : ""}`}
      title={
        copied ? "Copied to clipboard" : `Copy ${label ?? "value"}: ${value}`
      }
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      <Copy size={10} aria-hidden="true" />
      <code>{copied ? "COPIED ✓" : display}</code>
    </button>
  );
}

export function Mark() {
  return (
    <div className="sampraan-mark" aria-label="SAMPRAAN mark">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2l7 4v6c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6z" />
        <path d="M12 7v6" />
        <circle cx="12" cy="15.4" r="1.6" />
      </svg>
    </div>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="wordmark">
      <Mark />
      <div>
        <b>SAMPRAAN</b>
        {!compact && (
          <small>
            Secure Asset Management, Provenance, RBAC And Identity On-chain
            Network
          </small>
        )}
      </div>
    </div>
  );
}

export function Status({
  children,
  tone = "mint",
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  title?: string;
}) {
  return (
    <span className={`status ${signalTone[tone]}`} title={title}>
      <i />
      {children}
    </span>
  );
}

/** Label/value row for the session and request panels. */
export function InfoRow({
  label,
  value,
  mono,
  status,
}: {
  label: string;
  value: string;
  mono?: boolean;
  status?: Tone;
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={mono ? "mono" : ""}>{value}</strong>
      {status && (
        <Status tone={status}>{status === "mint" ? "MATCH" : "REVIEW"}</Status>
      )}
    </div>
  );
}

export function Eyebrow({
  children,
  bar = false,
}: {
  children: React.ReactNode;
  bar?: boolean;
}) {
  return (
    <div className="eyebrow">
      {children}
      {bar && <span className="eyebrow-bar" />}
    </div>
  );
}

export function Action({
  children,
  kind = "outline",
  onClick,
  disabled,
  type = "button",
  title,
}: {
  children: React.ReactNode;
  kind?: "outline" | "solid" | "text";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  return (
    <button
      type={type}
      className={`action ${kind}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-busy={disabled || undefined}
    >
      {children}
    </button>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      className={`theme-toggle ${compact ? "compact" : ""}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      <span>{compact ? "" : theme === "dark" ? "LIGHT" : "DARK"}</span>
    </button>
  );
}

/** Live managed-backend health, polled every 30s. */
export function BackendStatus() {
  const { data, isPending, isError } = trpc.health.useQuery(undefined, {
    refetchInterval: 30000,
    retry: 1,
  });
  const status = isError
    ? "OFFLINE"
    : data?.api === "OK"
      ? "ONLINE"
      : isPending
        ? "CHECKING"
        : "DEGRADED";
  const detail = isError
    ? "Backend unreachable — retrying automatically"
    : data
      ? `API ${data.api} · DATABASE ${data.database} · CHAIN ${data.blockchain.mode}`
      : "Contacting managed backend";
  return (
    <span
      className={`backend-status ${status.toLowerCase()}`}
      title={`Managed SAMPRAAN backend status: ${detail}`}
      role="status"
      aria-live="polite"
    >
      <i />
      {status}
    </span>
  );
}

/** Ashoka-chakra motif used in the utility bar. */
export function Chakra({
  className = "utility-chakra",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={12 + 2.6 * Math.cos(a)}
            y1={12 + 2.6 * Math.sin(a)}
            x2={12 + 9.2 * Math.cos(a)}
            y2={12 + 9.2 * Math.sin(a)}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/* Tricolor strip + utility bar. The tricolor is part of the project's
   institutional identity; the text-size controls are a genuine
   accessibility affordance, not decoration. */
export function UtilityBar() {
  return (
    <>
      <div className="tricolor" aria-hidden="true" />
      <div className="utility-bar">
        <span className="utility-chakra-wrap" aria-hidden="true">
          <Chakra className="utility-chakra" />
        </span>
        <div className="utility-inner">
          <span>भारत सरकार</span>
          <span className="utility-sep utility-hide-m" aria-hidden="true" />
          <span className="utility-hide-m">
            Bharat Electronics Limited (BEL)
          </span>
          <div className="utility-right">
            <Accessibility size={13} aria-hidden="true" />
            <div
              className="utility-a11y utility-hide-m"
              role="group"
              aria-label="Text size"
            >
              <button
                type="button"
                title="Decrease text size"
                onClick={() => {
                  document.documentElement.style.fontSize = "14px";
                }}
              >
                A-
              </button>
              <button
                type="button"
                title="Default text size"
                onClick={() => {
                  document.documentElement.style.fontSize = "16px";
                }}
              >
                A
              </button>
              <button
                type="button"
                title="Increase text size"
                onClick={() => {
                  document.documentElement.style.fontSize = "18px";
                }}
              >
                A+
              </button>
            </div>
            <span className="utility-hide-m">English / हिंदी</span>
          </div>
        </div>
      </div>
    </>
  );
}
