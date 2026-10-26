/* SAMPRAAN — public landing page.
 *
 * Composition note: every band states one thing and then gets out of the way.
 * Motion is used where it carries meaning — a beam that traces the audit path,
 * a slider that contrasts two trust models, a timeline that shows a sequence —
 * never as ambient decoration. All telemetry comes from the live tRPC hooks;
 * nothing on this page is fabricated demo data.
 */
import { useCallback, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBlockchainStatus, useObservatory } from "@/hooks/useSampraanData";
import { formatCount } from "@/lib/sampraan";
import {
  Action,
  Eyebrow,
  Status,
  ThemeToggle,
  UtilityBar,
  Wordmark,
} from "@/components/primitives";
import { AuroraBackground } from "@/components/aceternity/aurora-background";
import { Spotlight } from "@/components/aceternity/spotlight";
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import { Button as MovingBorderButton } from "@/components/aceternity/moving-border";
import { AnimatedTooltip } from "@/components/aceternity/animated-tooltip";
import { InfiniteMovingCards } from "@/components/aceternity/infinite-moving-cards";
import { BentoGrid, BentoGridItem } from "@/components/aceternity/bento-grid";
import { GlowingEffect } from "@/components/aceternity/glowing-effect";
import { PinContainer } from "@/components/aceternity/3d-pin";
import { EvervaultCard } from "@/components/aceternity/evervault-card";
import { ContainerScroll } from "@/components/aceternity/container-scroll-animation";
import { Timeline } from "@/components/aceternity/timeline";
import { StickyScroll } from "@/components/aceternity/sticky-scroll-reveal";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { Compare } from "@/components/aceternity/compare";
import { TracingBeam } from "@/components/aceternity/tracing-beam";
import { LampContainer } from "@/components/aceternity/lamp";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { HoverBorderGradient } from "@/components/aceternity/hover-border-gradient";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
} from "@/components/aceternity/resizable-navbar";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Box,
  Database,
  FileCheck2,
  Fingerprint,
  Gauge,
  HardDrive,
  KeyRound,
  Layers3,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Users,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Avatar data URIs so the tooltip avatars ship with the app instead   */
/* of hot-linking a third-party asset host.                            */
/* ------------------------------------------------------------------ */
function initialsAvatar(initials: string, from: string, to: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>` +
    `<text x="48" y="61" font-family="Plus Jakarta Sans,system-ui,sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ROLE_TOOLTIP = [
  {
    id: 1,
    name: "Administration",
    designation: "Identity lifecycle · role grants",
    image: initialsAvatar("AD", "#e66a0a", "#c2570a"),
  },
  {
    id: 2,
    name: "Asset Manager",
    designation: "Mint proposals · custody",
    image: initialsAvatar("MG", "#175bb5", "#123a6e"),
  },
  {
    id: 3,
    name: "Auditor",
    designation: "Read-only evidence · integrity",
    image: initialsAvatar("AU", "#0e8f92", "#0b6f72"),
  },
  {
    id: 4,
    name: "Custodian",
    designation: "Accept transfers · view granted",
    image: initialsAvatar("CU", "#1a8f4b", "#136b38"),
  },
];

/* Facts, each paired with the mechanism that makes it true. */
const MARQUEE = [
  {
    quote:
      "Content is encrypted before it reaches storage, so only ciphertext ever leaves the server.",
    name: "AES-256-GCM · per-object data keys",
    title: "ENCRYPTION",
  },
  {
    quote: "The chain — not the browser — decides every protected transition.",
    name: "Smart-contract re-verification",
    title: "AUTHORITY",
  },
  {
    quote:
      "Marketplace transfers are permanently disabled. Custody moves only through the guarded path.",
    name: "SampraanAssetRegistry",
    title: "CUSTODY",
  },
  {
    quote:
      "A proposal executes exactly once, after distinct-actor approval and a timelock.",
    name: "2-of-N multisig · execute-once",
    title: "GOVERNANCE",
  },
  {
    quote:
      "Every sensitive action requires a fresh, single-use, purpose-bound signature.",
    name: "DID-signed step-up challenges",
    title: "STEP-UP",
  },
  {
    quote:
      "Only digests and addresses go on-chain. No personal data, no asset bytes.",
    name: "keccak256 anchors only",
    title: "MINIMISATION",
  },
  {
    quote:
      "Four validators, two-second blocks, immediate finality — no reorganisations.",
    name: "Hyperledger Besu QBFT",
    title: "CONSENSUS",
  },
  {
    quote: "The read model can be rebuilt from chain events at any time.",
    name: "Idempotent event indexer",
    title: "RECOVERABILITY",
  },
];

const CAPABILITIES = [
  {
    title: "Decentralized identity",
    icon: Fingerprint,
    body: "W3C DID documents kept off-chain, with keccak256(DID) anchoring the wallet and status on-chain. Keys rotate with versioned documents; revoked keys fail verification.",
    points: [
      "did:method:identifier",
      "Rotation + revocation",
      "Purpose-bound challenges",
    ],
  },
  {
    title: "Policy engine",
    icon: LockKeyhole,
    body: "RBAC and asset classification are resolved server-side on every request. A client-asserted role or classification never influences a decision.",
    points: [
      "ADMIN · MANAGER · AUDITOR · USER",
      "5 classification levels",
      "Deterministic risk score",
    ],
  },
  {
    title: "Restricted asset registry",
    icon: Box,
    body: "Each asset is an ERC-721 token, but approve, setApprovalForAll, transferFrom and safeTransferFrom are permanently disabled. Custody changes only via the guarded, governed path.",
    points: [
      "Non-transferable token",
      "Custody history",
      "Lifecycle: suspend · restore · revoke",
    ],
  },
  {
    title: "Encrypted content",
    icon: HardDrive,
    body: "Every version gets a fresh data key; the blob is encrypted before it is written to the operator's own Kubo node, and the data key is wrapped by the master key.",
    points: [
      "Per-object data keys",
      "sha256 integrity proof",
      "Self-hosted Kubo — no pinning service",
    ],
  },
  {
    title: "Governance pipeline",
    icon: Layers3,
    body: "Maker-checker with 2-of-N multisig approval and a timelock before execution. Self-approval is rejected on-chain, and re-execution reverts.",
    points: [
      "Distinct-actor approval",
      "Timelock window",
      "Execute-once semantics",
    ],
  },
  {
    title: "Audit and provenance",
    icon: FileCheck2,
    body: "Application decisions and on-chain evidence land in one queryable trail with transaction hash, block number and block hash attached to each protected transition.",
    points: [
      "16-entry verified trail",
      "Chain-event projection",
      "Receipt-level evidence",
    ],
  },
];

const LIFECYCLE_STEPS = [
  {
    step: "01",
    title: "Identity",
    body: "A DID document is created and the identity reference is anchored on-chain, best-effort and fully audited.",
  },
  {
    step: "02",
    title: "Authenticate",
    body: "The operator signs a server-issued challenge with the identity key. Nonces are single-use and audience-bound.",
  },
  {
    step: "03",
    title: "Authorize",
    body: "Role, classification and risk resolve into ALLOW, DENY or CHALLENGE — before any state changes.",
  },
  {
    step: "04",
    title: "Execute",
    body: "The protected transition is submitted on-chain and only accepted once a real receipt confirms it.",
  },
  {
    step: "05",
    title: "Record",
    body: "Transaction hash, block number and block hash are attached to the audit record as evidence.",
  },
  {
    step: "06",
    title: "Verify",
    body: "Provenance reconstructs the full history from application and chain events, independently of the UI.",
  },
];

const TIMELINE_DATA = LIFECYCLE_STEPS.map(s => ({
  title: `${s.step} · ${s.title}`,
  content: (
    <p className="mb-6 max-w-md text-sm leading-relaxed text-[var(--muted)] md:text-base">
      {s.body}
    </p>
  ),
}));

const ENFORCEMENT_LAYERS = [
  {
    title: "Identity gate",
    description:
      "Session resolution happens server-side. A suspended or revoked identity is rejected on the next request — the browser cannot keep a stale grant alive.",
  },
  {
    title: "Policy engine",
    description:
      "Role, asset classification and identity state combine into a deterministic risk score. The outcome is legible before the transaction is attempted.",
  },
  {
    title: "Backend authorization",
    description:
      "Every mutating procedure re-checks permission. A frontend-only check is never treated as a decision.",
  },
  {
    title: "Smart contract",
    description:
      "The contract re-verifies role and identity status independently, and rejects the transition outright if anything disagrees.",
  },
  {
    title: "Immutable evidence",
    description:
      "A confirmed receipt — transaction hash, block number, block hash — is written to the audit trail. A failure records a failure, never a misleading success.",
  },
];

const NAIVE_STEPS = [
  "Browser decides what the user may do",
  "One shared admin credential opens everything",
  "Access rules live only in the frontend bundle",
  "Content is stored in plaintext at rest",
  "History is a mutable application log",
];

const SAMPRAAN_STEPS = [
  "Server resolves role, classification and risk",
  "DID-key-signed, single-use step-up per operation",
  "Contract re-verifies every protected transition",
  "AES-256-GCM before the blob reaches storage",
  "Receipt-backed, append-only evidence trail",
];

function stepList(items: string[], tone: "bad" | "good") {
  return (
    <ul className={`lp-steps lp-steps-${tone}`}>
      {items.map(text => (
        <li key={text}>
          <span aria-hidden="true">{tone === "good" ? "✓" : "✕"}</span>
          {text}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */
const NAV_LINKS = [
  { name: "Capabilities", link: "#capabilities" },
  { name: "Architecture", link: "#architecture" },
  { name: "Evidence", link: "#evidence" },
];

function LandingNav({ onEnter }: { onEnter: () => void }) {
  const [open, setOpen] = useState(false);
  const go = useCallback((link: string) => {
    document
      .querySelector(link)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <Navbar className="top-0">
      <NavBody className="ac-glass border border-[var(--material-hairline)]">
        <Wordmark compact />
        <NavItems
          items={NAV_LINKS}
          className="relative inset-auto justify-end space-x-1 pr-2 lg:space-x-1 [&_a]:px-3 [&_a]:text-[13px] [&_a]:font-semibold [&_a]:text-[var(--text)]"
        />
        <div className="relative z-20 flex shrink-0 items-center gap-2">
          <ThemeToggle compact />
          <NavbarButton
            as="button"
            variant="primary"
            onClick={onEnter}
            className="rounded-full bg-[var(--orange)] px-5 text-[13px] font-bold text-white hover:-translate-y-0"
          >
            Open workspace
          </NavbarButton>
        </div>
      </NavBody>

      <MobileNav className="ac-glass mx-3 rounded-2xl border border-[var(--material-hairline)] px-3 py-2 lg:hidden">
        <MobileNavHeader>
          <Wordmark compact />
          <MobileNavToggle isOpen={open} onClick={() => setOpen(v => !v)} />
        </MobileNavHeader>
        <MobileNavMenu isOpen={open}>
          {NAV_LINKS.map(item => (
            <button
              key={item.name}
              type="button"
              className="w-full text-left text-[15px] font-semibold text-[var(--text)]"
              onClick={() => {
                go(item.link);
                setOpen(false);
              }}
            >
              {item.name}
            </button>
          ))}
          <NavbarButton
            as="button"
            variant="primary"
            onClick={onEnter}
            className="w-full rounded-full bg-[var(--orange)] text-white"
          >
            Open workspace
          </NavbarButton>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}

/* ------------------------------------------------------------------ */
/* Bands                                                               */
/* ------------------------------------------------------------------ */
function Hero({ onEnter }: { onEnter: () => void }) {
  const { data: chain } = useBlockchainStatus();
  const { data: obs } = useObservatory();
  const online = chain?.connected ?? false;

  return (
    <AuroraBackground className="lp-hero items-stretch justify-start">
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="var(--orange)"
      />
      <div className="ac-shell lp-hero-inner">
        <div className="lp-hero-copy">
          <Eyebrow>
            PROBLEM STATEMENT 26125 · BLOCKCHAIN &amp; CYBERSECURITY
          </Eyebrow>
          <TextGenerateEffect
            as="h1"
            words="Trust every identity. Control every access. Prove every asset."
            className="ac-display mt-6 text-[var(--navy-900)] dark:text-[var(--text)]"
            duration={0.5}
          />
          <p className="ac-lead mt-7 max-w-xl">
            SAMPRAAN is a permissioned Hyperledger Besu network where
            decentralized identity, smart-contract policy and encrypted content
            storage together decide every access to an enterprise asset — and
            record the decision as evidence.
          </p>

          <div className="lp-hero-cta">
            <MovingBorderButton
              borderRadius="9999px"
              duration={3200}
              containerClassName="h-12 w-auto"
              borderClassName="h-20 w-20 bg-[radial-gradient(var(--orange)_40%,transparent_60%)] opacity-90"
              className="border-none bg-[var(--orange)] px-7 text-[13.5px] font-bold tracking-[0.01em] text-white hover:bg-[var(--orange-strong)]"
              onClick={onEnter}
            >
              Open the workspace
              <ArrowRight size={15} className="ml-2" />
            </MovingBorderButton>
            <Action
              kind="text"
              onClick={() =>
                document
                  .getElementById("capabilities")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Review the architecture
            </Action>
          </div>

          <div className="lp-hero-roles">
            <AnimatedTooltip items={ROLE_TOOLTIP} />
            <span>Four roles, resolved server-side on every request.</span>
          </div>
        </div>

        <div className="lp-hero-panel">
          <NoiseBackground
            gradientColors={["#e66a0a", "#175bb5", "#12a3a6"]}
            noiseIntensity={0.09}
            speed={0.05}
            containerClassName="lp-fabric-frame"
            className="lp-fabric"
          >
            <div className="lp-fabric-head">
              <Eyebrow bar>LIVE FABRIC</Eyebrow>
              <Status tone={online ? "mint" : "amber"}>
                {online
                  ? "CHAIN HEALTHY"
                  : chain
                    ? "CHAIN UNREACHABLE"
                    : "AWAITING CHAIN"}
              </Status>
            </div>
            <dl className="lp-fabric-grid">
              <div>
                <dt>Identities</dt>
                <dd>{obs ? obs.identityCount : "—"}</dd>
              </div>
              <div>
                <dt>Assets</dt>
                <dd>{obs ? obs.assetCount : "—"}</dd>
              </div>
              <div>
                <dt>Audit events</dt>
                <dd>{obs ? obs.auditEventCount : "—"}</dd>
              </div>
              <div>
                <dt>Open signals</dt>
                <dd>{obs ? obs.openAlertCount : "—"}</dd>
              </div>
            </dl>
            <div className="lp-fabric-chain">
              <Blocks size={15} />
              <span>
                <b>Besu / QBFT</b>
                <small>
                  chain {chain?.chainId ?? "—"} · block{" "}
                  {formatCount(chain?.latestBlock)} · {chain?.mode ?? "offline"}
                </small>
              </span>
            </div>
            <p className="lp-fabric-note">
              Every figure above is read from the live network. No sample or
              seeded counts are shown on this page.
            </p>
          </NoiseBackground>
        </div>
      </div>
    </AuroraBackground>
  );
}

function Marquee() {
  return (
    <section className="lp-marquee ac-band" aria-label="Design guarantees">
      <div className="ac-shell">
        <div className="lp-band-head">
          <Eyebrow>DESIGN GUARANTEES</Eyebrow>
          <h2 className="ac-display-sm">Claims that hold under inspection</h2>
          <p className="ac-lead max-w-2xl">
            Each guarantee below names the mechanism that enforces it, so the
            claim can be checked against the code and the live network rather
            than taken on trust.
          </p>
        </div>
      </div>
      <InfiniteMovingCards
        items={MARQUEE}
        direction="left"
        speed="slow"
        pauseOnHover
        className="mt-12 max-w-none"
      />
    </section>
  );
}

function Capabilities() {
  return (
    <section id="capabilities" className="lp-band ac-band">
      <div className="ac-shell">
        <div className="lp-band-head">
          <Eyebrow>CAPABILITIES</Eyebrow>
          <h2 className="ac-display-sm">
            Six surfaces, one authorization boundary
          </h2>
          <p className="ac-lead max-w-2xl">
            The pieces are separate systems, but they share a single decision
            path. Nothing on this page is a policy engine of its own.
          </p>
        </div>
        <BentoGrid className="lp-bento mt-14 md:auto-rows-[20rem]">
          {CAPABILITIES.map((cap, index) => (
            <div
              key={cap.title}
              className={`relative rounded-2xl ${index === 0 || index === 3 ? "md:col-span-2" : ""}`}
            >
              <GlowingEffect
                spread={40}
                glow
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
                movementDuration={12}
              />
              <BentoGridItem
                className="h-full rounded-2xl border-[var(--material-hairline)] bg-[var(--panel)] shadow-[var(--elev-2)] dark:border-[var(--material-hairline)] dark:bg-[var(--panel)] dark:shadow-[var(--elev-2)]"
                title={
                  <span className="text-[15px] font-extrabold tracking-[-0.01em] text-[var(--navy-900)] dark:text-[var(--text)]">
                    {cap.title}
                  </span>
                }
                description={
                  <div className="space-y-4">
                    <p className="text-[13px] leading-relaxed text-[var(--muted)]">
                      {cap.body}
                    </p>
                    <ul className="lp-chips">
                      {cap.points.map(p => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                }
                header={
                  <div className="lp-bento-icon">
                    <cap.icon size={19} />
                  </div>
                }
              />
            </div>
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

function Showcase({ onEnter }: { onEnter: () => void }) {
  const { data: chain } = useBlockchainStatus();
  return (
    <section className="lp-showcase">
      <ContainerScroll
        titleComponent={
          <div className="lp-band-head lp-band-head-center">
            <Eyebrow>CONTROL PLANE</Eyebrow>
            <h2 className="ac-display-sm">
              The workspace operators actually work in
            </h2>
            <p className="ac-lead mx-auto max-w-2xl">
              Authorisation decisions, custody history and chain evidence share
              one screen, so an operator can explain a decision without leaving
              it.
            </p>
          </div>
        }
      >
        <div className="lp-console">
          <div className="lp-console-bar">
            <span className="lp-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="lp-console-title">SAMPRAAN · COMMAND CENTER</span>
            <Status tone={chain?.connected ? "mint" : "amber"}>
              {chain?.connected
                ? `BLOCK ${formatCount(chain.latestBlock)}`
                : "OFFLINE"}
            </Status>
          </div>
          <div className="lp-console-body">
            {[
              {
                icon: Gauge,
                label: "Overview",
                note: "Fabric posture, live decisions, custody activity",
              },
              {
                icon: Fingerprint,
                label: "Identity",
                note: "DID lifecycle, key rotation, role grants",
              },
              {
                icon: LockKeyhole,
                label: "Access Control",
                note: "Dry-run the decision before it is attempted",
              },
              {
                icon: Box,
                label: "Assets",
                note: "Registry, custody history, encrypted versions",
              },
              {
                icon: Timer,
                label: "Governance",
                note: "Maker-checker, multisig quorum, timelock",
              },
              {
                icon: FileCheck2,
                label: "Audit Evidence",
                note: "Receipt-level trail with block anchors",
              },
            ].map(row => (
              <div className="lp-console-row" key={row.label}>
                <span className="lp-console-icon">
                  <row.icon size={16} />
                </span>
                <span className="lp-console-row-copy">
                  <b>{row.label}</b>
                  <small>{row.note}</small>
                </span>
                <ArrowRight size={14} className="lp-console-arrow" />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="lp-console-cta lp-solid"
            onClick={onEnter}
          >
            Open the workspace <ArrowRight size={14} />
          </button>
        </div>
      </ContainerScroll>
    </section>
  );
}

function Lifecycle() {
  return (
    <section id="lifecycle" className="lp-lifecycle ac-band">
      <div className="ac-shell">
        <Timeline
          data={TIMELINE_DATA}
          heading="How an operation actually completes"
          subheading="Six phases, in order. Each one either produces evidence or refuses the operation."
        />
      </div>
    </section>
  );
}

function Enforcement() {
  return (
    <section id="architecture" className="lp-enforcement">
      <BackgroundBeams className="opacity-[0.16]" />
      <div className="ac-shell relative z-10">
        <div className="lp-band-head lp-band-head-invert">
          <Eyebrow>ENFORCEMENT</Eyebrow>
          <h2 className="ac-display-sm">
            Five layers, any of which can say no
          </h2>
          <p className="ac-lead max-w-2xl">
            Authorization is never delegated to the browser. Each layer
            independently rejects what the layers above it might miss.
          </p>
        </div>
        <div className="mt-14">
          <StickyScroll content={ENFORCEMENT_LAYERS} />
        </div>
      </div>
    </section>
  );
}

function ArchitectureCompare() {
  return (
    <section className="lp-compare ac-band">
      <div className="ac-shell">
        <div className="lp-band-head lp-band-head-center">
          <Eyebrow>TRUST MODEL</Eyebrow>
          <h2 className="ac-display-sm">Where the authority sits</h2>
          <p className="ac-lead mx-auto max-w-2xl">
            Drag the divider. The difference is not the feature list — it is who
            is allowed to decide.
          </p>
        </div>

        <div className="lp-compare-stage">
          <Compare
            className="h-[min(58vh,520px)] w-full"
            initialSliderPercentage={46}
            slideMode="drag"
            showHandlebar
            firstContent={
              <div className="lp-compare-pane lp-compare-pane-bad">
                <Eyebrow>CLIENT-TRUSTING</Eyebrow>
                {stepList(NAIVE_STEPS, "bad")}
              </div>
            }
            secondContent={
              <div className="lp-compare-pane lp-compare-pane-good">
                <Eyebrow>SAMPRAAN</Eyebrow>
                {stepList(SAMPRAAN_STEPS, "good")}
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

function Evidence() {
  const { data: obs } = useObservatory();

  const trail = [
    {
      label: "Identity registered",
      detail: "DID document stored off-chain, reference anchored on-chain",
      icon: Fingerprint,
    },
    {
      label: "Role granted",
      detail: "Server-side RBAC assignment, written to the audit trail",
      icon: Users,
    },
    {
      label: "Asset minted",
      detail: "Governed proposal executed after 2-of-N approval and timelock",
      icon: Box,
    },
    {
      label: "Custody assigned",
      detail: "Contract re-verified both identities as ACTIVE on-chain",
      icon: BadgeCheck,
    },
    {
      label: "Content version added",
      detail: "Encrypted with a fresh data key, integrity hash recorded",
      icon: HardDrive,
    },
    {
      label: "Transfer denied",
      detail: "Policy engine refused before any chain submission",
      icon: ShieldAlert,
    },
    {
      label: "Receipt recorded",
      detail: "Transaction hash, block number and block hash attached",
      icon: FileCheck2,
    },
  ];

  return (
    <section id="evidence" className="lp-evidence ac-band">
      <div className="ac-shell">
        <div className="lp-band-head">
          <Eyebrow>PROVENANCE</Eyebrow>
          <h2 className="ac-display-sm">One asset, one readable history</h2>
          <p className="ac-lead max-w-2xl">
            Application decisions and chain evidence land in the same trail, so
            a history can be read without cross-referencing a second system.
          </p>
        </div>

        <div className="lp-evidence-grid mt-14">
          <TracingBeam className="px-4 sm:px-6">
            <ol className="lp-trail">
              {trail.map(node => (
                <li key={node.label} className="lp-trail-node ac-card">
                  <span className="lp-trail-icon">
                    <node.icon size={17} />
                  </span>
                  <div>
                    <b>{node.label}</b>
                    <p>{node.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </TracingBeam>

          <aside className="lp-evidence-aside">
            <EvervaultCard text="ENCRYPTED" className="aspect-auto h-[320px]" />
            <div className="ac-card lp-evidence-card">
              <Eyebrow>WHAT STORAGE SEES</Eyebrow>
              <p>
                A per-object data key encrypts each blob with AES-256-GCM. The
                ciphertext — and only the ciphertext — is written to the
                operator's own Kubo node.
              </p>
              <ul className="lp-chips">
                <li>data key wrapped by master key</li>
                <li>sha256(plaintext) verified on read</li>
                <li>tampered CID fails retrieval</li>
              </ul>
              <div className="lp-evidence-stat">
                <span>Audit events on record</span>
                <b>{formatCount(obs?.auditEventCount)}</b>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Network() {
  const { data: chain } = useBlockchainStatus();
  const nodes = [
    {
      title: "Consensus",
      detail: "4 validators · 2s blocks · immediate finality",
      icon: Blocks,
      href: "#architecture",
    },
    {
      title: "Contracts",
      detail: "Access control, identity, asset registry, governance",
      icon: LockKeyhole,
      href: "#architecture",
    },
    {
      title: "Read model",
      detail: "MySQL projections, rebuildable from chain events",
      icon: Database,
      href: "#evidence",
    },
    {
      title: "Content store",
      detail: "Self-hosted Kubo node holding ciphertext only",
      icon: HardDrive,
      href: "#evidence",
    },
  ];

  return (
    <section className="lp-network ac-band">
      <div className="ac-shell">
        <div className="lp-band-head lp-band-head-center">
          <Eyebrow>DEPLOYMENT SHAPE</Eyebrow>
          <h2 className="ac-display-sm">
            Four moving parts, all operator-controlled
          </h2>
          <p className="ac-lead mx-auto max-w-2xl">
            Nothing here depends on a third-party chain, pinning service or
            managed database. The operator supplies the network and holds the
            keys.
          </p>
        </div>

        <div className="lp-network-pins">
          {nodes.map(node => (
            <PinContainer
              key={node.title}
              title={node.title}
              href={node.href}
              containerClassName="h-[264px] w-full"
            >
              <div className="lp-pin-card">
                <span className="lp-pin-icon">
                  <node.icon size={18} />
                </span>
                <b>{node.title}</b>
                <p>{node.detail}</p>
              </div>
            </PinContainer>
          ))}
        </div>

        <dl className="lp-network-facts">
          <div>
            <dt>Chain ID</dt>
            <dd>{chain?.chainId ?? "—"}</dd>
          </div>
          <div>
            <dt>Consensus</dt>
            <dd>{chain?.mode ?? "—"}</dd>
          </div>
          <div>
            <dt>Latest block</dt>
            <dd>{formatCount(chain?.latestBlock)}</dd>
          </div>
          <div>
            <dt>Client</dt>
            <dd title={chain?.nodeVersion ?? undefined}>
              {chain?.nodeVersion?.split("/")[0] ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function FinalCta({ onEnter }: { onEnter: () => void }) {
  return (
    <LampContainer className="lp-cta">
      <div className="lp-cta-inner">
        <Eyebrow>SAMPRAAN</Eyebrow>
        <h2 className="ac-display-sm mt-5 text-white">
          Identity is verified before
          <br />
          access is granted.
        </h2>
        <p className="ac-lead mt-6 max-w-xl">
          Every decision begins with a proof route and ends with a receipt. Open
          the workspace and walk one through.
        </p>
        <div className="lp-cta-actions">
          <MovingBorderButton
            borderRadius="9999px"
            duration={3200}
            containerClassName="h-12 w-auto"
            borderClassName="h-20 w-20 bg-[radial-gradient(var(--saffron)_40%,transparent_60%)] opacity-90"
            className="border-none px-7 text-[13.5px] font-bold lp-solid"
            onClick={onEnter}
          >
            Authenticate and enter
            <ArrowRight size={15} className="ml-2" />
          </MovingBorderButton>
          <HoverBorderGradient
            containerClassName="rounded-full"
            className="bg-transparent px-6 py-3 text-[13px] font-bold text-[#e6ecf6]"
            as="button"
            onClick={onEnter}
          >
            Read the evidence trail
          </HoverBorderGradient>
        </div>
        <ul className="lp-cta-proof">
          <li>
            <ShieldCheck size={14} /> Step-up required per operation
          </li>
          <li>
            <KeyRound size={14} /> Session revocable server-side
          </li>
          <li>
            <Zap size={14} /> Receipt-backed transitions
          </li>
        </ul>
      </div>
    </LampContainer>
  );
}

function Footer({ onEnter }: { onEnter: () => void }) {
  return (
    <footer className="public-footer">
      <div className="tricolor" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-brand">
          <Wordmark compact />
          <p>
            Secure Asset Management, Provenance, RBAC And Identity On-chain
            Network.
          </p>
          <span className="footer-note">
            PROTOTYPE / ACADEMIC DEMONSTRATION — NOT AN OFFICIAL BEL OR
            GOVERNMENT PRODUCT
          </span>
        </div>
        <div className="footer-col">
          <h4>WORKSPACE</h4>
          <button type="button" onClick={onEnter}>
            Identity
          </button>
          <button type="button" onClick={onEnter}>
            Assets
          </button>
          <button type="button" onClick={onEnter}>
            Governance
          </button>
          <button type="button" onClick={onEnter}>
            Audit evidence
          </button>
        </div>
        <div className="footer-col">
          <h4>PROJECT</h4>
          <span>Problem statement 26125</span>
          <span>BEL · Blockchain &amp; Cybersecurity</span>
          <span>Smart India Hackathon 2026</span>
        </div>
        <div className="footer-col">
          <h4>TECHNICAL</h4>
          <span>Hyperledger Besu / QBFT</span>
          <span>W3C DID · ML-DSA-65</span>
          <span>AES-256-GCM · Kubo</span>
        </div>
      </div>
      <div className="footer-base">
        <div className="footer-base-inner">
          <span>© 2026 SAMPRAAN</span>
          <span>PERMISSIONED · VERIFIABLE · ACCOUNTABLE</span>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
export default function Landing({ enter }: { enter: () => void }) {
  const { user } = useAuth();
  const onEnter = useCallback(() => enter(), [enter]);

  return (
    <div className="landing" id="top">
      <UtilityBar />
      <LandingNav onEnter={onEnter} />
      <main>
        <Hero onEnter={onEnter} />
        <Marquee />
        <Capabilities />
        <Showcase onEnter={onEnter} />
        <Lifecycle />
        <Enforcement />
        <ArchitectureCompare />
        <Evidence />
        <Network />
        <FinalCta onEnter={onEnter} />
      </main>
      <Footer onEnter={user ? onEnter : onEnter} />
    </div>
  );
}
