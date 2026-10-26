/* SAMPRAAN — operator workspace.
 *
 * The public landing page lives in ./Landing.tsx. This module renders the
 * authenticated workspace: the shell (utility bar + header) and every
 * workspace page. Brand primitives come from @/components/primitives so the
 * landing page and the workspace cannot drift apart.
 *
 * All data and mutation logic is unchanged — the same tRPC procedures and
 * contracts as before.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  accessLevelSummary,
  alertMetrics,
  alertStatusTone,
  assetMix,
  decisionLabel,
  decisionTone,
  formatClock,
  formatTimestamp,
  formatTxHash,
  formatCount,
  identityMap,
  matchesAssetQuery,
  MATRIX_LEVELS,
  MATRIX_RESOURCES,
  permissionGlyph,
  permissionLabel,
  permissionMatrix,
  primaryAlert,
  severityTone,
  shortDid,
  statusTone,
  toAssetRows,
  toAuditRows,
  toDecisionRows,
  toEventFeed,
  truncateMid,
  type Tone,
} from "@/lib/sampraan";
import { AssetWorkspace } from "@/components/AssetWorkspace";
import {
  Action,
  CopyChip,
  Eyebrow,
  InfoRow,
  Mark,
  Status,
  UtilityBar,
  Wordmark,
} from "@/components/primitives";
import { GlowingEffect } from "@/components/aceternity/glowing-effect";
import Landing from "@/pages/Landing";
import { GovernancePage } from "@/pages/GovernancePage";
import { EvidencePage } from "@/pages/EvidencePage";
import {
  useAssets,
  useAuditEvents,
  useBlockchainStatus,
  useIdentities,
  useObservatory,
  useSecurityAlerts,
} from "@/hooks/useSampraanData";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  LogOut,
  Menu,
  Network,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  User,
  X,
} from "lucide-react";

const systemStatus = [
  "ACTIVE IDENTITIES",
  "POLICY DECISIONS",
  "REGISTERED ASSETS",
  "AUDIT EVENTS",
  "BESU / QBFT NETWORK",
  "SECURITY SIGNALS",
];

/* Shared proximity-glow settings for command-centre panels: the border lights
   up as the pointer approaches, which shows which panel is about to be read. */
const PANEL_GLOW = {
  spread: 44,
  blur: 0,
  proximity: 70,
  inactiveZone: 0.02,
  borderWidth: 2,
  movementDuration: 10,
  disabled: false,
} as const;

const NAV_MAIN = [
  "Overview",
  "Identity",
  "Access Control",
  "Assets",
  "Governance",
  "Evidence",
  "Audit Evidence",
  "Intelligence",
  "Administration",
];

function ChainChip() {
  const { data: chain } = useBlockchainStatus();
  const online = chain?.connected ?? false;
  return (
    <span
      className="gov-chain"
      title={
        chain
          ? `${chain.network} · block ${chain.latestBlock}`
          : "Contacting chain"
      }
    >
      <i />
      {online && chain ? (
        <span className="gov-chain-meta">
          <b>BESU ONLINE</b>
          <small>#{formatCount(chain.latestBlock)}</small>
        </span>
      ) : (
        <b>{chain ? chain.mode : "…"}</b>
      )}
    </span>
  );
}
function GovHeader({
  page,
  setPage,
  mobileOpen,
  setMobileOpen,
  onSignIn,
}: {
  page?: string;
  setPage?: (p: string) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (v: boolean) => void;
  onSignIn?: () => void;
}) {
  const { user, logout } = useAuth();
  const { data: identities } = useIdentities();
  const myIdentity = user
    ? identities?.find(item => item.linkedUserId === user.id)
    : undefined;
  const roleLabel = user
    ? user.role === "admin"
      ? "ADMIN"
      : (myIdentity?.roles?.[0] ?? "USER").toUpperCase()
    : null;
  const didLabel = myIdentity
    ? shortDid(myIdentity.did, 12)
    : user
      ? "SESSION VERIFIED"
      : null;
  const name = myIdentity?.displayName ?? user?.name ?? user?.email ?? "";
  const navTarget = (label: string) => {
    if (setPage) {
      setPage(label);
      return;
    }
    document
      .getElementById(label === "Overview" ? "top" : "capabilities")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <>
      <header className="gov-header">
        <div className="gov-header-inner">
          <div className="gov-brand">
            <Wordmark compact />
            <span className="gov-badge">BEL Prototype</span>
          </div>
          <nav className="gov-nav" aria-label="Primary">
            {NAV_MAIN.map(label => (
              <button
                key={label}
                className={page === label ? "active" : ""}
                onClick={() => navTarget(label)}
                aria-current={page === label ? "page" : undefined}
              >
                {label === "Evidence"
                  ? "External Evidence"
                  : label === "Audit Evidence"
                    ? "Audit"
                    : label === "Intelligence"
                      ? "Security Intelligence"
                      : label}
              </button>
            ))}
          </nav>
          <div className="gov-header-actions">
            <ChainChip />
            {user ? (
              <>
                <span
                  className="gov-user"
                  title={`${name} · ${didLabel ?? ""}`}
                >
                  <Fingerprint />
                  <span className="gov-user-meta">
                    <span>DID: {didLabel}</span>
                    <b>Role: {roleLabel}</b>
                  </span>
                  <ChevronDown className="chev" size={13} />
                </span>
                <button
                  className="gov-logout"
                  onClick={() => logout()}
                  aria-label="Sign out (revokes server-side session)"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <>
                <span className="gov-avatar" aria-hidden="true">
                  <User size={15} />
                </span>
                <button
                  className="gov-signin"
                  onClick={() =>
                    onSignIn ? onSignIn() : navTarget("Overview")
                  }
                >
                  Sign In <ArrowRight size={14} />
                </button>
              </>
            )}
            <button
              className="gov-menu-btn"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen?.(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>
      <div className={`gov-mobile-nav ${mobileOpen ? "open" : ""}`}>
        {NAV_MAIN.map(label => (
          <button
            key={label}
            className={page === label ? "active" : ""}
            onClick={() => {
              navTarget(label);
              setMobileOpen?.(false);
            }}
          >
            {label === "Evidence"
              ? "External Evidence"
              : label === "Audit Evidence"
                ? "Audit"
                : label === "Intelligence"
                  ? "Security Intelligence"
                  : label}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------- Fabric map (workspace topology) ---------- */
function FabricNode({
  label,
  kind,
  x,
  y,
  active,
  onClick,
}: {
  label: string;
  kind: string;
  x: number;
  y: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`fabric-node ${active ? "active" : ""}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
    >
      <span className="node-symbol">{kind}</span>
      <strong>{label}</strong>
      <small>{active ? "TRANSACTION ACTIVE" : "VERIFIED"}</small>
    </button>
  );
}
function FabricMap({ interactive = false }: { interactive?: boolean }) {
  const [selected, setSelected] = useState("Identity");
  return (
    <div className="fabric-map">
      <svg
        className="fabric-lines"
        viewBox="0 0 800 440"
        preserveAspectRatio="none"
      >
        <path d="M144 102 L320 76 L506 120 L689 92 M320 76 L392 220 L506 120 M392 220 L194 332 L558 342 L689 92 M392 220 L690 330" />
        <path
          className="route"
          d="M145 102 L320 76 L506 120 L689 92 L558 342"
        />
        <circle cx="320" cy="76" r="4" />
        <circle cx="506" cy="120" r="4" />
        <circle cx="689" cy="92" r="4" />
        <circle cx="194" cy="332" r="4" />
        <circle cx="558" cy="342" r="4" />
        <circle cx="392" cy="220" r="4" />
      </svg>
      <FabricNode
        label="Identity"
        kind="ID"
        x={12}
        y={16}
        active={selected === "Identity"}
        onClick={() => interactive && setSelected("Identity")}
      />
      <FabricNode
        label="Policy"
        kind="P"
        x={36}
        y={10}
        active={selected === "Policy"}
        onClick={() => interactive && setSelected("Policy")}
      />
      <FabricNode
        label="Contract"
        kind="SC"
        x={60}
        y={20}
        active={selected === "Contract"}
        onClick={() => interactive && setSelected("Contract")}
      />
      <FabricNode
        label="Blockchain"
        kind="B"
        x={83}
        y={14}
        active={selected === "Blockchain"}
        onClick={() => interactive && setSelected("Blockchain")}
      />
      <FabricNode
        label="Asset"
        kind="A"
        x={17}
        y={69}
        active={selected === "Asset"}
        onClick={() => interactive && setSelected("Asset")}
      />
      <FabricNode
        label="Audit"
        kind="E"
        x={66}
        y={71}
        active={selected === "Audit"}
        onClick={() => interactive && setSelected("Audit")}
      />
      <div className="fabric-center">
        <span>
          TRUST
          <br />
          FABRIC
        </span>
        <b>{selected.toUpperCase()}</b>
        <small>NODE VERIFIED</small>
      </div>
      <div className="route-event">
        <span />
        <b>ACCESS REQUEST</b>
        <small>PROOF ROUTE / LIVE</small>
      </div>
      <div className="fabric-legend" aria-label="Diagram legend">
        <span>
          <i className="flow" />
          REQUEST FLOW — every access request walks this path
        </span>
        <span>
          <i />
          NODE — a SAMPRAAN control-plane component
        </span>
      </div>
    </div>
  );
}

/* ---------- Workspace pages ---------- */
function CommandCenter() {
  const { data, isLoading: summaryLoading } = useObservatory();
  const { data: auditEvents, isLoading: auditLoading } = useAuditEvents();
  const { data: identities } = useIdentities();
  const { data: assets } = useAssets();
  const { user } = useAuth();
  const me = user
    ? identities?.find(item => item.linkedUserId === user.id)
    : undefined;
  const firstName = (me?.displayName ?? user?.name ?? "Operator").split(" ")[0];
  const roleLabel = user
    ? user.role === "admin"
      ? "ADMIN"
      : (me?.roles?.[0] ?? "USER")
    : "OPERATOR";
  const decisions = useMemo(
    () => toDecisionRows(auditEvents, identities),
    [auditEvents, identities]
  );
  const feed = useMemo(() => toEventFeed(auditEvents), [auditEvents]);
  const mix = useMemo(() => assetMix(assets), [assets]);
  const shownDecisions = decisions;
  const shownFeed = feed;
  const alertsOpen = data?.openAlertCount ?? 0;
  const totals = [
    summaryLoading
      ? "…"
      : data?.identityCount !== undefined
        ? `${data.identityCount} REGISTERED`
        : "0 REGISTERED",
    data?.auditEventCount ? `${data.auditEventCount} DECISIONS` : "0 DECISIONS",
    data?.assetCount !== undefined ? `${data.assetCount} ASSETS` : "0 ASSETS",
    data?.auditEventCount !== undefined
      ? `${data.auditEventCount} EVENTS`
      : "0 EVENTS",
    data?.blockchain
      ? `BLOCK ${formatCount(data.blockchain.latestBlock)} / ${data.blockchain.mode}`
      : "QBFT CONSENSUS",
    alertsOpen > 0 ? `${alertsOpen} SIGNALS` : "NO SIGNALS",
  ];

  const chainLive = !!data?.blockchain?.connected;
  const systemDegraded = alertsOpen > 0 || !chainLive;
  return (
    <>
      <div className="posture-hero">
        <div>
          <Eyebrow>SAMPRAAN COMMAND CENTER / LIVE</Eyebrow>
          <h1>Welcome, {firstName}</h1>
          <p>
            The current condition of the security fabric across identity,
            policy, asset, audit, and network layers.
          </p>
          <div className="hero-identity-chips">
            <span title={me?.did}>
              <b>DID</b> {me ? shortDid(me.did) : (user?.email ?? "—")}
            </span>
            <span>
              <b>ROLE</b> {roleLabel}
            </span>
            <span className="ok">AUTHENTICATED</span>
          </div>
        </div>
        <div className="posture-score system-status-block">
          <div className={`system-status-pill ${systemDegraded ? "warn" : ""}`}>
            <i aria-hidden="true" />
            <b>
              {summaryLoading
                ? "CHECKING…"
                : systemDegraded
                  ? `OPERATIONAL · ${alertsOpen} SIGNAL${alertsOpen === 1 ? "" : "S"}`
                  : "OPERATIONAL"}
            </b>
          </div>
          <small className="system-status-sub">
            RULE-BASED SIGNAL COUNT · NOT AN AI SCORE
          </small>
        </div>
        <div className="posture-list">
          {systemStatus.map((label, i) => (
            <div key={label}>
              <span
                className={`posture-check ${i === 5 && alertsOpen > 0 ? "warn" : ""}`}
              >
                {i === 5 && alertsOpen > 0 ? "!" : "✓"}
              </span>
              <b>{label}</b>
              <small>{totals[i]}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="command-grid">
        <section className="workspace-panel fabric-panel">
          <GlowingEffect {...PANEL_GLOW} />
          <PanelHead
            eyebrow="TRUST FABRIC / LIVE"
            title="Control-plane relationships"
            action="Open topology"
          />
          <FabricMap interactive />
          <div className="panel-footer">
            <span>
              <i className="moving-dot" /> TRANSACTION ROUTE{" "}
              {data?.blockchain?.connected ? "ACTIVE" : "STANDBY"}
            </span>
            <code>
              {data?.blockchain
                ? `BLOCK ${formatCount(data.blockchain.latestBlock)} / ${data.blockchain.mode}`
                : "AWAITING CHAIN"}
            </code>
          </div>
        </section>
        <section className="workspace-panel decision-panel">
          <GlowingEffect {...PANEL_GLOW} />
          <PanelHead
            eyebrow={
              auditEvents?.length
                ? "POLICY ENGINE / LIVE DECISIONS"
                : "POLICY ENGINE / AWAITING EVIDENCE"
            }
            title="Recent decisions"
            action="View all"
          />
          <div className="decision-list">
            {shownDecisions.map(row => (
              <div className={`decision-card tone-${row.tone}`} key={row.key}>
                <div className="decision-card-head">
                  <span className="who">
                    <b>{row.actorName}</b>
                    <code title={row.fullDid ?? undefined}>{row.did}</code>
                  </span>
                  <Status tone={row.tone}>{row.decision}</Status>
                </div>
                <div className="decision-card-grid">
                  <span>ACTION</span>
                  <b>{row.action}</b>
                  <span>RESOURCE</span>
                  <b title={row.asset}>{row.asset}</b>
                  <span>TIME</span>
                  <b>{row.time}</b>
                  <span>EVIDENCE</span>
                  <b>
                    {row.txHash
                      ? `tx ${truncateMid(row.txHash, 8)}${row.block ? ` · block ${row.block}` : ""}`
                      : "off-chain decision"}
                  </b>
                </div>
                {row.reason && (
                  <div className="decision-card-why">
                    <b>WHY</b>
                    <span>{row.reason}</span>
                  </div>
                )}
              </div>
            ))}
            {auditLoading && !shownDecisions.length && (
              <div className="decision-card tone-muted">
                <div className="decision-card-head">
                  <span className="who">
                    <b>Syncing decision stream…</b>
                    <code>awaiting backend</code>
                  </span>
                  <Status tone="muted">LOADING</Status>
                </div>
              </div>
            )}
          </div>
          {!auditLoading && !auditEvents?.length && (
            <p className="panel-note">
              No authorization decisions recorded yet. Request a transfer from
              Access Control to generate live evidence.
            </p>
          )}
        </section>
        <section className="workspace-panel events-panel">
          <GlowingEffect {...PANEL_GLOW} />
          <PanelHead
            eyebrow={
              auditEvents?.length
                ? "AUDIT EVIDENCE / LIVE STREAM"
                : "AUDIT EVIDENCE / AWAITING EVENTS"
            }
            title="Recent security events"
            action="Open evidence"
          />
          <div className="event-list">
            {shownFeed.map(row => (
              <div className="event-row" key={row.key}>
                <i className={row.tone} />
                <div>
                  <b className="truncate" title={row.label}>
                    {row.label}
                  </b>
                  <small className="truncate" title={row.meta}>
                    {row.meta}
                  </small>
                </div>
                <time>{row.time}</time>
              </div>
            ))}
            {!auditLoading && !shownFeed.length && (
              <p className="panel-note">
                No audit events yet. Real operations (login, identity
                registration, mint, transfer) appear here.
              </p>
            )}
          </div>
        </section>
        <section className="workspace-panel asset-panel">
          <GlowingEffect {...PANEL_GLOW} />
          <PanelHead
            eyebrow="ASSET ACTIVITY / REGISTRY"
            title="Controlled resources"
            action="Asset registry"
          />
          <div className="asset-activity">
            <div className="asset-total">
              <strong>{data?.assetCount ?? 0}</strong>
              <span>PROTECTED ASSETS</span>
              <Status>
                {assets?.length ? "INTEGRITY ON RECORD" : "NO ASSETS YET"}
              </Status>
            </div>
            <div className="asset-lines">
              {(assets?.length
                ? mix
                : [
                    { label: "FIRMWARE", count: 0, ratio: 0 },
                    { label: "INSTRUMENTS", count: 0, ratio: 0 },
                    { label: "DOCUMENTS", count: 0, ratio: 0 },
                    { label: "CRYPTO MATERIAL", count: 0, ratio: 0 },
                  ]
              ).map(bucket => (
                <Fragment key={bucket.label}>
                  <span>{bucket.label}</span>
                  <i style={{ width: `${bucket.ratio}%` }} />
                  <b>{String(bucket.count).padStart(2, "0")}</b>
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
function PanelHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="workspace-panel-head">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2>{title}</h2>
      </div>
      {action && (
        <button>
          {action}
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
const DID_METHODS = ["sampraan", "ethr", "key", "web"];
function PermissionMatrix({
  permissionKeys,
  roles,
}: {
  permissionKeys: string[];
  roles: string[];
}) {
  const matrix = useMemo(
    () => permissionMatrix(permissionKeys),
    [permissionKeys]
  );
  return (
    <div className="evidence-block" style={{ marginTop: 14 }}>
      <h4>
        ACCESS PERMISSIONS · {roles.length ? roles.join(" + ") : "NO ROLE"}
      </h4>
      <div className="permission-matrix">
        <table>
          <thead>
            <tr>
              <th>RESOURCE</th>
              {MATRIX_LEVELS.map(level => (
                <th key={level}>{level}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_RESOURCES.map(resource => (
              <tr key={resource}>
                <td>{resource}</td>
                {MATRIX_LEVELS.map(level => {
                  const ok = matrix[resource][level];
                  return (
                    <td key={level}>
                      <span
                        className={ok ? "perm-yes" : "perm-no"}
                        title={`${level} on ${resource}: ${ok ? "granted" : "not granted"}`}
                      >
                        {permissionGlyph(ok)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="panel-note">
        Derived from the server-side role catalog.{" "}
        {roles.length
          ? "The smart contract re-verifies every protected operation on-chain."
          : "Assign a role to grant access — no permissions are inferred client-side."}
      </p>
    </div>
  );
}
function SessionSummary() {
  const { user } = useAuth();
  const { data: identities } = useIdentities();
  const { data: rolesCatalog } = trpc.identities.roles.useQuery(undefined, {
    enabled: !!user,
    retry: 1,
  });
  const me = user
    ? identities?.find(item => item.linkedUserId === user.id)
    : undefined;
  if (!user) return null;
  const roles = me?.roles ?? [];
  const perms = (rolesCatalog ?? [])
    .filter(role => roles.includes(role.name))
    .flatMap(role => role.permissions);
  return (
    <div className="evidence-block" style={{ marginTop: 16 }}>
      <h4>CURRENT SESSION</h4>
      <div className="decision-proof">
        <div>
          <span>IDENTITY</span>
          <code className="truncate" title={me?.did}>
            {me ? shortDid(me.did) : user.email}
          </code>
        </div>
        <div>
          <span>ROLE</span>
          <code>
            {roles.length
              ? roles.join(" + ")
              : user.role === "admin"
                ? "PLATFORM ADMIN"
                : "NONE ASSIGNED"}
          </code>
        </div>
        <div>
          <span>ACCESS LEVEL</span>
          <code>{accessLevelSummary(roles)}</code>
        </div>
        <div>
          <span>SESSION</span>
          <code>Authenticated · httpOnly · server-tracked</code>
        </div>
      </div>
      <ul className="permission-list" style={{ marginTop: 12 }}>
        {perms.slice(0, 6).map(perm => (
          <li key={perm} className="can">
            <span className="glyph">✓</span>
            {permissionLabel(perm)}{" "}
            <code style={{ fontSize: 9, color: "var(--subtle)" }}>{perm}</code>
          </li>
        ))}
        {!perms.length && (
          <li className="cannot">
            <span className="glyph">✕</span>No domain permissions on this
            identity
          </li>
        )}
      </ul>
    </div>
  );
}
/**
 * DID key lifecycle status (DID hardening UX). Renders the server-resolved
 * key generation state for the session's DID — the browser NEVER asserts
 * key status; this is a read-only reflection of did.keyStatus.
 */
function DidKeyStatus({ did }: { did: string }) {
  const { data, isError } = trpc.did.keyStatus.useQuery(
    { did },
    { retry: false }
  );
  if (isError || !data) return null;
  const tone =
    data.keyStatus === "ACTIVE"
      ? "mint"
      : data.keyStatus === "REVOKED"
        ? "red"
        : "amber";
  const label =
    data.keyStatus === "ACTIVE"
      ? "KEY CURRENT"
      : data.keyStatus === "REVOKED"
        ? "KEY REVOKED — AUTHENTICATION BLOCKED"
        : "KEY ROTATED — RE-ENROLL REQUIRED";
  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Status
        tone={tone as Tone}
        title={`Server-resolved DID key lifecycle state: ${data.keyStatus}`}
      >
        {label}
      </Status>
      {data.rotatedAt && (
        <code
          style={{ fontSize: 10, color: "var(--subtle)" }}
          title="Current key generation activated at"
        >
          rotated {formatClock(data.rotatedAt)}
        </code>
      )}
    </div>
  );
}
function IdentityPage() {
  const {
    data: identities,
    isLoading: identitiesLoading,
    error: identitiesError,
    source: identitiesSource,
  } = useIdentities();
  const { data: rolesCatalog } = trpc.identities.roles.useQuery(undefined, {
    retry: 1,
  });
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const identity =
    identities?.find(item => !!user && item.linkedUserId === user.id) ??
    identities?.find(i => i.id === selectedId) ??
    identities?.[0];
  const identityTone = statusTone(identity?.status ?? "ACTIVE");
  const identityIsLive = identitiesSource === "live" && !!identities?.length;
  const revoked = identity?.status === "REVOKED";
  const org =
    identity?.organization ??
    (identitiesLoading ? "SYNCING…" : "Bharat Electronics Lab");
  const isAdmin = user?.role === "admin";
  // create-identity form state
  const [form, setForm] = useState({
    displayName: "",
    organization: "",
    did: "",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [roleDraft, setRoleDraft] = useState<string[]>([]);
  const invalidate = () => {
    void utils.identities.invalidate();
    void utils.observatory.invalidate();
    void utils.audit.invalidate();
  };
  const createMutation = trpc.identities.create.useMutation({
    onSuccess: created => {
      setShowCreate(false);
      setForm({ displayName: "", organization: "", did: "", status: "ACTIVE" });
      setFormErrors({});
      invalidate();
      setSelectedId(created.id);
      toast.success("Identity registered", {
        description:
          created.anchor?.outcome === "ANCHORED"
            ? `Anchored on-chain in tx ${created.anchor.transactionHash?.slice(0, 18)}…`
            : "Created in the registry (chain anchor: " +
              String(created.anchor?.outcome).toLowerCase() +
              ").",
      });
    },
    onError: error => {
      const msg = error.message;
      const field = msg.toLowerCase().includes("did")
        ? "did"
        : msg.toLowerCase().includes("displayname")
          ? "displayName"
          : msg.toLowerCase().includes("organization")
            ? "organization"
            : "form";
      setFormErrors({ [field]: msg });
      toast.error("Identity registration rejected", { description: msg });
    },
  });
  const statusMutation = trpc.identities.setStatus.useMutation({
    onSuccess: updated => {
      invalidate();
      toast.success(`Identity ${updated.status.toLowerCase()}`, {
        description:
          updated.changed && updated.anchor?.outcome === "ANCHORED"
            ? `Lifecycle anchored on-chain (tx ${updated.anchor.reason?.slice(0, 18)}…)`
            : `Read model updated${updated.changed && updated.anchor ? ` — chain anchor ${String(updated.anchor.outcome).toLowerCase()}` : ""}. Session privileges apply immediately.`,
      });
    },
    onError: error =>
      toast.error("Status change failed", { description: error.message }),
  });
  const rolesMutation = trpc.identities.assignRoles.useMutation({
    onSuccess: result => {
      setShowRoles(false);
      invalidate();
      toast.success("Roles updated", {
        description: `Roles set to ${result.roles.join(", ")}. Effective on the next operation.`,
      });
    },
    onError: error =>
      toast.error("Role assignment failed", { description: error.message }),
  });
  const { data: identityHistory } = trpc.identities.history.useQuery(
    { identityId: identity?.id ?? "" },
    { enabled: !!identity?.id && showHistory, retry: false }
  );
  const validateCreate = () => {
    const errors: Record<string, string> = {};
    if (form.displayName.trim().length < 2)
      errors.displayName = "Display name must be at least 2 characters";
    if (form.organization.trim().length < 2)
      errors.organization = "Organization must be at least 2 characters";
    if (!/^did:[a-z][a-z0-9]*:[A-Za-z0-9._\-]+$/.test(form.did.trim()))
      errors.did =
        "Invalid DID format (expected did:method:identifier, e.g. did:sampraan:operator-42)";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const submitCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateCreate()) return;
    createMutation.mutate({
      displayName: form.displayName.trim(),
      organization: form.organization.trim(),
      did: form.did.trim(),
      status: form.status as "ACTIVE" | "SUSPENDED" | "REVOKED",
    });
  };
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>TRUST FABRIC / IDENTITY</Eyebrow>
          <h1>Cryptographic Identity</h1>
          <p>
            A self-sovereign identity record with verifiable proof of
            possession.
          </p>
        </div>
        <Status
          tone={revoked ? "red" : identityTone === "mint" ? "mint" : "amber"}
        >
          {identitiesLoading
            ? "LOADING"
            : revoked
              ? "REVOKED"
              : identityIsLive
                ? "VERIFIED"
                : "DEMO RECORD"}
        </Status>
      </div>
      <SessionSummary />
      <div className="identity-grid">
        <div className="identity-card primary">
          <div className="identity-seal">
            <Fingerprint size={33} />
            <span>
              {revoked ? "REVOKED" : "VERIFIED"}
              <br />
              DID
            </span>
          </div>
          <Eyebrow>IDENTITY STATUS</Eyebrow>
          <h2 className="truncate-mid" title={identity?.did ?? undefined}>
            <code>
              {identitiesLoading
                ? "SYNCING IDENTITY RECORD…"
                : (identity?.did ?? "—")}
            </code>
          </h2>
          <div className="identity-meta">
            <span>
              OPERATOR
              <strong className="truncate" title={identity?.displayName}>
                {identity?.displayName ?? "—"}
              </strong>
            </span>
            <span>
              ORGANIZATION
              <strong className="truncate" title={org}>
                {org}
              </strong>
            </span>
            <span>
              ROLES
              <strong>
                {identity?.roles?.length ? identity.roles.join(" + ") : "—"}
              </strong>
            </span>
            <span>
              STATUS
              <strong className={identityTone}>
                {identityIsLive ? (identity?.status ?? "ACTIVE") : "DEMO"}
              </strong>
            </span>
          </div>
          {identity?.did && <DidKeyStatus did={identity.did} />}
          {!!identity?.did && <CopyChip value={identity.did} label="DID" />}
          <div className="identity-actions">
            {identityIsLive && (
              <Action
                kind="solid"
                disabled={statusMutation.isPending || !isAdmin}
                onClick={() =>
                  identity &&
                  statusMutation.mutate({
                    identityId: identity.id,
                    status:
                      identity.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                  })
                }
                title={
                  isAdmin
                    ? "Suspend / reactivate via the admin API"
                    : "Admin session required"
                }
              >
                {identity?.status === "ACTIVE" ? "Suspend" : "Reactivate"}{" "}
                <ShieldCheck size={15} />
              </Action>
            )}
            {identityIsLive && (
              <Action
                kind="text"
                disabled={statusMutation.isPending || !isAdmin}
                onClick={() => {
                  if (
                    identity &&
                    window.confirm(
                      `Revoke ${identity.displayName}? The linked session is rejected immediately and the revocation is anchored on-chain.`
                    )
                  )
                    statusMutation.mutate({
                      identityId: identity.id,
                      status: "REVOKED",
                    });
                }}
                title={
                  isAdmin
                    ? "Revoke via the admin API"
                    : "Admin session required"
                }
              >
                Revoke Identity
              </Action>
            )}
            {identityIsLive && isAdmin && (
              <Action
                onClick={() => {
                  setRoleDraft(identity?.roles ?? []);
                  setShowRoles(true);
                }}
              >
                Manage Roles <KeyRound size={15} />
              </Action>
            )}
            {identityIsLive && (
              <Action kind="text" onClick={() => setShowHistory(v => !v)}>
                History
              </Action>
            )}
          </div>
        </div>
        <div className="identity-card proof">
          <PanelHead
            eyebrow="IDENTITY REGISTRY"
            title={`Registered identities (${identities?.length ?? 0})`}
          />
          {identitiesLoading ? (
            <div className="module-record row-loading">SYNCING REGISTRY…</div>
          ) : (
            <div className="sampraan-table-wrap">
              <table className="sampraan-table">
                <thead>
                  <tr>
                    <th>DID</th>
                    <th>OPERATOR</th>
                    <th>ROLES</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(identities ?? []).map(item => (
                    <tr
                      key={item.id}
                      className={identity?.id === item.id ? "active" : ""}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td title={item.did}>{shortDid(item.did)}</td>
                      <td
                        className="truncate"
                        style={{ maxWidth: 160 }}
                        title={item.displayName}
                      >
                        {item.displayName}
                      </td>
                      <td>
                        {item.roles?.length
                          ? item.roles.map(r => (
                              <span key={r} className="role-chip">
                                {r}
                              </span>
                            ))
                          : "—"}
                      </td>
                      <td>
                        <Status tone={statusTone(item.status)}>
                          {item.status}
                        </Status>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {identity && (
            <PermissionMatrix
              permissionKeys={(rolesCatalog ?? [])
                .filter(role => identity.roles?.includes(role.name))
                .flatMap(role => role.permissions)}
              roles={identity.roles ?? []}
            />
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="identity-actions" style={{ marginTop: 18 }}>
          <Action
            kind="solid"
            onClick={() => {
              setShowCreate(true);
              setFormErrors({});
            }}
          >
            <Plus size={15} /> Register Identity
          </Action>
        </div>
      )}
      {!!identitiesError && (
        <p className="panel-note" role="alert">
          Identity registry unavailable (
          {String(
            (identitiesError as { message?: string }).message ?? "network error"
          )}
          ). {user ? "Retry shortly." : "Sign in to load the live registry."}
        </p>
      )}
      {showCreate && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Register identity"
          onClick={e => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="sampraan-dialog">
            <div className="sampraan-dialog-head">
              <div>
                <Eyebrow>IDENTITY ADMINISTRATION</Eyebrow>
                <h2>Register identity</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={submitCreate} noValidate>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="id-name">
                  DISPLAY NAME
                </label>
                <input
                  id="id-name"
                  className="sampraan-input"
                  value={form.displayName}
                  onChange={e =>
                    setForm(f => ({ ...f, displayName: e.target.value }))
                  }
                  placeholder="Operator name"
                  aria-invalid={!!formErrors.displayName}
                />
                {formErrors.displayName && (
                  <p className="sampraan-field-error" role="alert">
                    {formErrors.displayName}
                  </p>
                )}
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="id-org">
                  ORGANIZATION
                </label>
                <input
                  id="id-org"
                  className="sampraan-input"
                  value={form.organization}
                  onChange={e =>
                    setForm(f => ({ ...f, organization: e.target.value }))
                  }
                  placeholder="Bharat Electronics Limited"
                  aria-invalid={!!formErrors.organization}
                />
                {formErrors.organization && (
                  <p className="sampraan-field-error" role="alert">
                    {formErrors.organization}
                  </p>
                )}
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="id-did">
                  DID (W3C syntax did:method:identifier)
                </label>
                <input
                  id="id-did"
                  className="sampraan-input"
                  value={form.did}
                  onChange={e => setForm(f => ({ ...f, did: e.target.value }))}
                  placeholder={`did:sampraan:${DID_METHODS[0]}-operator-01`}
                  aria-invalid={!!formErrors.did}
                />
                {formErrors.did && (
                  <p className="sampraan-field-error" role="alert">
                    {formErrors.did}
                  </p>
                )}
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="id-status">
                  INITIAL STATUS
                </label>
                <select
                  id="id-status"
                  className="sampraan-select"
                  value={form.status}
                  onChange={e =>
                    setForm(f => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
                <p className="panel-note">
                  The DID document is created server-side and the identity
                  reference is anchored on the Besu chain (best-effort, fully
                  audited).
                </p>
              </div>
              <div className="sampraan-dialog-actions">
                <Action type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Action>
                <Action
                  kind="solid"
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? "REGISTERING…"
                    : "REGISTER IDENTITY"}
                </Action>
              </div>
            </form>
          </div>
        </div>
      )}
      {showRoles && identity && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Manage roles"
          onClick={e => {
            if (e.target === e.currentTarget) setShowRoles(false);
          }}
        >
          <div className="sampraan-dialog">
            <div className="sampraan-dialog-head">
              <div>
                <Eyebrow>RBAC ADMINISTRATION</Eyebrow>
                <h2>Roles — {identity.displayName}</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setShowRoles(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="sampraan-field">
              <span className="sampraan-label">
                ASSIGN ROLES (server-side, audited)
              </span>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                {(rolesCatalog ?? []).map(role => (
                  <button
                    type="button"
                    key={role.name}
                    className={`role-chip ${roleDraft.includes(role.name) ? "" : "off"}`}
                    onClick={() =>
                      setRoleDraft(d =>
                        d.includes(role.name)
                          ? d.filter(r => r !== role.name)
                          : [...d, role.name]
                      )
                    }
                    title={role.description ?? undefined}
                  >
                    {roleDraft.includes(role.name) ? "✓ " : ""}
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="evidence-block">
              <h4>CURRENT PERMISSIONS</h4>
              <div className="decision-proof">
                {(rolesCatalog ?? [])
                  .filter(role => roleDraft.includes(role.name))
                  .flatMap(role => role.permissions)
                  .filter((k, i, a) => a.indexOf(k) === i)
                  .map(perm => (
                    <div key={perm}>
                      <span>{perm.split(":")[0]}</span>
                      <code>{perm}</code>
                    </div>
                  ))}
              </div>
            </div>
            <div className="sampraan-dialog-actions">
              <Action type="button" onClick={() => setShowRoles(false)}>
                Cancel
              </Action>
              <Action
                kind="solid"
                disabled={rolesMutation.isPending || roleDraft.length === 0}
                onClick={() =>
                  rolesMutation.mutate({
                    identityId: identity.id,
                    roleNames: roleDraft as (
                      | "ADMIN"
                      | "MANAGER"
                      | "AUDITOR"
                      | "USER"
                    )[],
                  })
                }
              >
                {rolesMutation.isPending ? "UPDATING…" : "SAVE ROLES"}
              </Action>
            </div>
          </div>
        </div>
      )}
      {showHistory && identity && (
        <div className="evidence-band" style={{ marginTop: 16 }}>
          <div className="sampraan-table-wrap" style={{ width: "100%" }}>
            <table className="sampraan-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>ACTION</th>
                  <th>DECISION</th>
                  <th>EVIDENCE</th>
                </tr>
              </thead>
              <tbody>
                {(identityHistory ?? []).map(ev => (
                  <tr key={ev.id}>
                    <td>{formatClock(ev.timestamp)}</td>
                    <td>{ev.action.replace(/_/g, " ")}</td>
                    <td>
                      <Status tone={decisionTone(ev.decision)}>
                        {decisionLabel(ev.decision)}
                      </Status>
                    </td>
                    <td
                      title={ev.reason ?? undefined}
                      style={{
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTxHash(ev)}
                    </td>
                  </tr>
                ))}
                {(identityHistory ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      No history recorded for this identity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
function AccessPage() {
  const { isAuthenticated, user } = useAuth();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: identities } = useIdentities();
  const { data: policies } = trpc.policies.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
  });
  const utils = trpc.useUtils();
  const [decision, setDecision] = useState<{
    decision: "ALLOW" | "DENY" | "CHALLENGE";
    reason: string;
    policyId?: string;
    decisionId: string;
    timestamp: string;
    custodyUnchanged?: boolean;
    transaction: {
      transactionHash: string;
      blockNumber: number;
      status: "CONFIRMED" | "FAILED";
      blockHash?: string;
      contractAddress?: string;
      from?: string;
      to?: string;
      gasUsed?: number;
    } | null;
  } | null>(null);
  const [dryRun, setDryRun] = useState<{
    decision: "ALLOW" | "DENY" | "CHALLENGE";
    reason: string;
    actor: {
      identity: { displayName: string; status: string } | null;
      roles: string[];
      permissions: string[];
    };
    ownerStatus: string;
    contractChecks: { check: string; note: string }[];
  } | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string>("");
  const [recipientId, setRecipientId] = useState<string>("");
  const asset =
    assets?.find(a => a.id === assetId) ??
    assets?.find(a => a.status === "ACTIVE") ??
    assets?.[0];
  const actor = user
    ? identities?.find(item => item.linkedUserId === user.id)
    : undefined;
  const recipient = recipientId
    ? identities?.find(i => i.id === recipientId)
    : undefined;
  const actorRoles = actor?.roles ?? [];
  const transfer = trpc.assets.authorizeTransfer.useMutation({
    onSuccess: result => {
      setDecision(result);
      setDecisionError(null);
      toast[
        result.decision === "ALLOW"
          ? "success"
          : result.decision === "DENY"
            ? "error"
            : "warning"
      ](`Backend decision: ${result.decision}`, { description: result.reason });
      void utils.audit.invalidate();
      void utils.assets.invalidate();
      void utils.observatory.invalidate();
    },
    onError: error => {
      setDecisionError(error.message);
      setDecision(null);
      toast.error("Authorization request failed", {
        description: error.message,
      });
    },
  });
  const dryRunMutation = trpc.policies.evaluateTransfer.useMutation({
    onSuccess: result => {
      setDryRun(result);
      toast[
        result.decision === "ALLOW"
          ? "success"
          : result.decision === "DENY"
            ? "error"
            : "warning"
      ](`Dry-run: ${result.decision}`, {
        description: `${result.reason} — no chain submission.`,
      });
      void utils.audit.invalidate();
    },
    onError: error =>
      toast.error("Dry-run failed", { description: error.message }),
  });
  const evaluate = () => {
    if (!asset) {
      toast.warning("No registered asset available", {
        description: "Register an asset from the Assets registry first.",
      });
      return;
    }
    if (!isAuthenticated) {
      toast.info("Secure login required", {
        description:
          "The backend authorization boundary will evaluate this request after session authentication.",
      });
      return;
    }
    transfer.mutate({
      assetId: asset.id,
      recipientIdentityId: recipientId || undefined,
    });
  };
  const runDry = () => {
    if (!asset) {
      toast.warning("No registered asset available", {
        description: "Register an asset first.",
      });
      return;
    }
    if (!isAuthenticated) {
      toast.info("Sign-in required", {
        description:
          "The dry-run evaluates the CURRENT session actor server-side.",
      });
      return;
    }
    dryRunMutation.mutate({ assetId: asset.id });
  };
  const decisionClass = decision
    ? decision.decision === "DENY"
      ? "deny"
      : decision.decision === "CHALLENGE"
        ? "challenge"
        : "allow"
    : "standby";
  const activePolicies = (policies ?? []).filter(p => p.active);
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>TRUST FABRIC / POLICY ENGINE</Eyebrow>
          <h1>Authorization Control</h1>
          <p>Make the decision legible before the transaction is executed.</p>
        </div>
        <Status
          tone={decisionError ? "red" : transfer.isPending ? "amber" : "mint"}
        >
          {decisionError
            ? "REQUEST FAILED"
            : transfer.isPending
              ? "EVALUATING"
              : decision
                ? "DECISION RECORDED"
                : "POLICY ENGINE ACTIVE"}
        </Status>
      </div>
      <div className="auth-workspace">
        <div className="auth-column">
          <PanelHead
            eyebrow="ACTOR (SERVER-RESOLVED)"
            title="Session actor and effective permissions"
          />
          <InfoRow
            label="DID"
            value={
              actor
                ? shortDid(actor.did)
                : user
                  ? "session without SAMPRAAN identity"
                  : "unauthenticated"
            }
            mono
          />
          <InfoRow
            label="IDENTITY ROLES"
            value={
              actor?.roles?.length ? actor.roles.join(" + ") : "none assigned"
            }
          />
          <InfoRow
            label="PLATFORM"
            value={user ? (user.role === "admin" ? "ADMIN" : "USER") : "—"}
          />
          <InfoRow label="ORGANIZATION" value={actor?.organization ?? "—"} />
          <InfoRow
            label="CONTEXT"
            value={
              isAuthenticated ? "Authenticated session" : "Unauthenticated"
            }
            status={isAuthenticated ? "mint" : "amber"}
          />
          {actor && (
            <div className="evidence-block">
              <h4>EFFECTIVE PERMISSIONS</h4>
              <div className="decision-proof">
                {actorRoles.length ? (
                  actorRoles.map(p => (
                    <div key={p}>
                      <span>{p.split(":")[0]}</span>
                      <code>{p}</code>
                    </div>
                  ))
                ) : (
                  <div>
                    <span>—</span>
                    <code>no domain permissions on this identity</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="auth-column request">
          <PanelHead
            eyebrow="REQUEST"
            title="Asset, recipient and sensitivity"
          />
          <div className="sampraan-field">
            <label className="sampraan-label" htmlFor="ac-asset">
              ASSET
            </label>
            <select
              id="ac-asset"
              className="sampraan-select"
              value={asset?.id ?? ""}
              onChange={e => setAssetId(e.target.value)}
            >
              {(assets ?? []).map(a => (
                <option key={a.id} value={a.id}>
                  {a.assetId} · {a.name} ({a.classification})
                </option>
              ))}
            </select>
          </div>
          <div className="sampraan-field">
            <label className="sampraan-label" htmlFor="ac-recipient">
              RECIPIENT CUSTODIAN (OPTIONAL — DEFAULT: ACTOR)
            </label>
            <select
              id="ac-recipient"
              className="sampraan-select"
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
            >
              <option value="">Acting identity (self)</option>
              {(identities ?? [])
                .filter(i => i.status === "ACTIVE")
                .map(i => (
                  <option key={i.id} value={i.id}>
                    {i.displayName} · {shortDid(i.did)}
                  </option>
                ))}
            </select>
          </div>
          <InfoRow label="ACTION" value="Transfer custody" />
          <InfoRow
            label="SENSITIVITY"
            value={
              asset
                ? `${asset.classification.replaceAll("_", " ").toLowerCase()} sensitivity`
                : "—"
            }
            status={
              asset?.classification === "HIGHLY_SENSITIVE" ||
              asset?.classification === "CRITICAL"
                ? "amber"
                : "mint"
            }
          />
          <InfoRow
            label="RECIPIENT"
            value={recipient ? recipient.displayName : "Acting identity"}
            status={
              recipient
                ? recipient.status === "ACTIVE"
                  ? "mint"
                  : "red"
                : "muted"
            }
          />
        </div>
        <div className="decision-column">
          <Eyebrow>FINAL DECISION</Eyebrow>
          <div className={`decision-big ${decisionClass}`}>
            {decision?.decision === "DENY" ? (
              <X size={23} />
            ) : decision?.decision === "CHALLENGE" ? (
              <Clock3 size={23} />
            ) : (
              <Check size={23} />
            )}
            <strong>
              {decision ? decisionLabel(decision.decision) : "STANDBY"}
            </strong>
            <span>
              {decision
                ? decision.decision === "ALLOW"
                  ? "POLICY CONDITIONS SATISFIED"
                  : decision.decision === "DENY"
                    ? "POLICY CONDITIONS FAILED"
                    : "STEP-UP REQUIRED"
                : "AWAITING EVALUATION"}
            </span>
          </div>
          <div className="why-box">
            <Eyebrow>WHY?</Eyebrow>
            {[
              [
                "ROLE",
                actor?.roles?.[0] ?? "NO IDENTITY ROLE",
                decision
                  ? decision.decision === "ALLOW"
                    ? "mint"
                    : "red"
                  : "muted",
              ],
              ["RESOURCE", asset?.name ?? "—", "mint"],
              ["ACTION", "TRANSFER", "mint"],
              ["CLASSIFICATION", asset?.classification ?? "—", "amber"],
            ].map(([a, b, t]) => (
              <div key={a}>
                <span>{a}</span>
                <b>{String(b)}</b>
                <Status tone={t as Tone}>
                  {decision
                    ? t === "mint"
                      ? "MATCH"
                      : t === "red"
                        ? "FAIL"
                        : "REVIEW"
                    : "PENDING"}
                </Status>
              </div>
            ))}
          </div>
          {dryRun && (
            <div className="evidence-block">
              <h4>DRY-RUN EXPLANATION — {dryRun.decision}</h4>
              <p className="panel-note">{dryRun.reason}</p>
              <ul className="sampraan-checklist">
                {dryRun.contractChecks.map(check => (
                  <li
                    key={check.check}
                    className={dryRun.decision === "ALLOW" ? "" : "fail"}
                  >
                    <span>▸</span>
                    <span>
                      <b>{check.check}</b> — {check.note}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="decision-proof">
                <div>
                  <span>ACTOR ROLES</span>
                  <code>{dryRun.actor.roles.join(", ") || "none"}</code>
                </div>
                <div>
                  <span>ACTOR PERMS</span>
                  <code>{dryRun.actor.permissions.join(", ") || "none"}</code>
                </div>
                <div>
                  <span>OWNER STATUS</span>
                  <code>{dryRun.ownerStatus}</code>
                </div>
              </div>
            </div>
          )}
          {decision && (
            <div className="why-box decision-proof">
              <Eyebrow>DECISION PROOF</Eyebrow>
              <div>
                <span>DECISION ID</span>
                <code>{decision.decisionId}</code>
              </div>
              <div>
                <span>POLICY</span>
                <code>
                  {decision.policyId ?? "— / ROLE PERMISSION EVALUATION"}
                </code>
              </div>
              <div>
                <span>TIMESTAMP</span>
                <code>{formatTimestamp(decision.timestamp)}</code>
              </div>
              <div>
                <span>CHAIN ANCHOR</span>
                <code>
                  {decision.transaction?.status === "CONFIRMED" &&
                  decision.transaction.transactionHash
                    ? `${shortDid(decision.transaction.transactionHash, 8)} / #${formatCount(decision.transaction.blockNumber)}`
                    : decision.custodyUnchanged
                      ? "ALREADY IN CUSTODY — NO TRANSFER NEEDED"
                      : "OFF CHAIN — DENIED BEFORE EXECUTION"}
                </code>
              </div>
            </div>
          )}
          {decisionError && (
            <p className="panel-note" role="alert">
              Authorization request failed: {decisionError}. The policy engine
              could not evaluate this request — retry or verify the session.
            </p>
          )}
          <Action
            kind="solid"
            disabled={transfer.isPending || assetsLoading}
            onClick={evaluate}
            title={
              isAuthenticated
                ? "Submit a real TRANSFER request: policy engine → smart contract → Besu"
                : "Sign in to submit a real authorization request"
            }
          >
            {transfer.isPending
              ? "EVALUATING POLICY…"
              : isAuthenticated
                ? "REQUEST TRANSFER VIA BACKEND"
                : "TRANSFER (SIGN-IN REQUIRED)"}{" "}
            <ArrowRight size={15} />
          </Action>
          <Action
            disabled={dryRunMutation.isPending}
            onClick={runDry}
            title="Explain the decision the engine WOULD make — no chain submission"
          >
            {dryRunMutation.isPending ? "ANALYZING…" : "DRY-RUN / EXPLAIN"}{" "}
            <Terminal size={15} />
          </Action>
          {activePolicies.length > 0 && (
            <div className="evidence-block">
              <h4>POLICY CATALOG ({activePolicies.length} ACTIVE)</h4>
              <div className="sampraan-table-wrap">
                <table className="sampraan-table">
                  <thead>
                    <tr>
                      <th>POLICY</th>
                      <th>SUBJECT / RESOURCE / ACTION</th>
                      <th>CLASSIFICATION</th>
                      <th>EFFECT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePolicies.map(p => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>
                          {p.subjectRole ?? "any"} / {p.resourceType ?? "asset"}{" "}
                          / {p.action ?? "transfer"}
                        </td>
                        <td>{p.assetClassification ?? "any"}</td>
                        <td>
                          <Status
                            tone={decisionTone(
                              p.effect === "DENY"
                                ? "DENY"
                                : p.effect === "CHALLENGE"
                                  ? "CHALLENGE"
                                  : "ALLOW"
                            )}
                          >
                            {p.effect}
                          </Status>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="panel-note">
                The deterministic engine in authorization.service.ts is the
                source of truth; this catalog documents its high-sensitivity
                guard. Contract checks always re-verify on-chain.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetsPage() {
  const { isAuthenticated, user } = useAuth();
  const {
    data: backendAssets,
    isLoading: assetsLoading,
    error: assetsError,
    source: assetsSource,
  } = useAssets();
  const { data: identities } = useIdentities();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string>("");
  const [txDetail, setTxDetail] = useState<{
    assetId: string;
    hash: string;
    block: number | null;
  } | null>(null);
  const liveRows = useMemo(
    () => toAssetRows(backendAssets, identities),
    [backendAssets, identities]
  );
  const usingDemo = !liveRows.length;
  const rows = usingDemo ? [] : liveRows;
  const filtered = rows.filter(row => matchesAssetQuery(row, query));
  const selected =
    backendAssets?.find(a => a.id === selectedKey) ??
    backendAssets?.find(a => a.assetId === filtered[0]?.assetId) ??
    backendAssets?.[0];
  const selectedCustodian =
    selected && identities
      ? identities.find(i => i.id === selected.custodianIdentityId)
      : undefined;
  const isAdmin = user?.role === "admin";
  const actorDid = user
    ? (identities?.find(item => item.linkedUserId === user.id)?.did ?? null)
    : null;
  const invalidate = () => {
    void utils.assets.invalidate();
    void utils.observatory.invalidate();
    void utils.audit.invalidate();
  };
  const [form, setForm] = useState({
    assetId: "",
    name: "",
    type: "",
    classification: "CONTROLLED",
    description: "",
    custodianIdentityId: "",
    integrityHash: "",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const register = trpc.assets.create.useMutation({
    onSuccess: asset => {
      setShowCreate(false);
      invalidate();
      setSelectedKey(asset.id);
      toast.success("Asset registered", {
        description:
          asset.anchor?.outcome === "ANCHORED"
            ? `Minted on-chain — NFT token ${asset.tokenId ?? "assigned"} (tx ${asset.anchor.transactionHash?.slice(0, 18)}…).`
            : "Created in the registry. Chain anchor: " +
              String(asset.anchor?.outcome).toLowerCase() +
              " — see audit evidence.",
      });
      if (asset.anchor?.outcome === "ANCHORED" && asset.anchor.transactionHash)
        setTxDetail({
          assetId: asset.assetId,
          hash: asset.anchor.transactionHash,
          block: asset.anchor.blockNumber ?? null,
        });
    },
    onError: error => {
      const msg = error.message;
      const field = msg.toLowerCase().includes("assetid")
        ? "assetId"
        : msg.toLowerCase().includes("name")
          ? "name"
          : msg.toLowerCase().includes("type")
            ? "type"
            : msg.toLowerCase().includes("custodian")
              ? "custodianIdentityId"
              : msg.toLowerCase().includes("owner")
                ? "custodianIdentityId"
                : "form";
      setFormErrors({ [field]: msg });
      toast.error("Asset registration rejected", { description: msg });
    },
  });
  const assignMutation = trpc.assets.assign.useMutation({
    onSuccess: result => {
      setShowAssign(false);
      invalidate();
      toast.success("Custody assigned", {
        description: `Confirmed on-chain in block ${result.transaction.blockNumber} (tx ${result.transaction.transactionHash.slice(0, 18)}…).`,
      });
      setTxDetail({
        assetId: selected?.assetId ?? "",
        hash: result.transaction.transactionHash,
        block: result.transaction.blockNumber,
      });
    },
    onError: error =>
      toast.error("Assignment rejected", { description: error.message }),
  });
  const statusMutation = trpc.assets.setStatus.useMutation({
    onSuccess: updated => {
      invalidate();
      toast.success(`Asset ${updated.status.toLowerCase()}`, {
        description:
          updated.changed && updated.anchor?.outcome === "ANCHORED"
            ? `Lifecycle anchored on-chain (tx ${updated.anchor.reason?.slice(0, 18)}…)`
            : "Read model updated.",
      });
    },
    onError: error =>
      toast.error("Status change failed", { description: error.message }),
  });
  const { data: assetDetail } = trpc.assets.detail.useQuery(
    { assetId: selected?.id ?? "" },
    { enabled: !!selected?.id && isAuthenticated && !!txDetail, retry: false }
  );
  const submitCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (form.assetId.trim().length < 2)
      errors.assetId = "Asset ID must be at least 2 characters";
    if (form.name.trim().length < 2)
      errors.name = "Name must be at least 2 characters";
    if (form.type.trim().length < 2)
      errors.type = "Type must be at least 2 characters";
    if (!form.custodianIdentityId)
      errors.custodianIdentityId = "Select the owner / custodian identity";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    register.mutate({
      assetId: form.assetId.trim(),
      name: form.name.trim(),
      type: form.type.trim(),
      classification: form.classification as
        | "PUBLIC"
        | "CONTROLLED"
        | "SENSITIVE"
        | "HIGHLY_SENSITIVE"
        | "CRITICAL",
      description: form.description.trim() || undefined,
      ownerIdentityId: form.custodianIdentityId,
      custodianIdentityId: form.custodianIdentityId,
      integrityHash: form.integrityHash.trim() || undefined,
      status: form.status as "ACTIVE" | "PENDING" | "REVOKED",
    });
  };
  const statusLine = assetsLoading
    ? "SYNCING REGISTRY…"
    : usingDemo
      ? "DEMO REGISTRY UNAVAILABLE — SIGN IN"
      : `${liveRows.length} ASSETS${filtered.length !== liveRows.length ? ` / ${filtered.length} SHOWN` : ""} / ${liveRows.every(row => row.statusTone === "mint") ? "ALL ACTIVE" : "REVIEW REQUIRED"}`;
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>DIGITAL ASSETS / BLOCKCHAIN PROVENANCE</Eyebrow>
          <h1>Digital Assets</h1>
          <p>Manage digital assets and verify their blockchain provenance.</p>
        </div>
        <Action
          kind="solid"
          disabled={register.isPending || !isAdmin}
          onClick={() => {
            setForm(f => ({
              ...f,
              custodianIdentityId:
                f.custodianIdentityId ||
                identities?.find(i => i.status === "ACTIVE")?.id ||
                "",
            }));
            setShowCreate(true);
            setFormErrors({});
          }}
          title={
            isAdmin
              ? "Open the asset registration form (admin API)"
              : "Admin session required"
          }
        >
          <Plus size={15} />{" "}
          {register.isPending ? "MINTING…" : "Register Asset"}
        </Action>
      </div>
      <div className="asset-table-panel">
        <div className="table-toolbar">
          <label className="table-search" htmlFor="sampraan-asset-search">
            <Search size={14} aria-hidden="true" />
            <input
              id="sampraan-asset-search"
              type="search"
              placeholder="Search assets"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search assets by name, id, classification, or custodian"
            />
          </label>
          <Status tone={usingDemo && !assetsLoading ? "muted" : "mint"}>
            {statusLine}
          </Status>
        </div>
        <div className="asset-table">
          <div className="asset-thead">
            <span>ASSET</span>
            <span>NFT TOKEN</span>
            <span>CLASSIFICATION</span>
            <span>CUSTODIAN</span>
            <span>STATUS</span>
            <span>REGISTERED</span>
          </div>
          {filtered.map(row => {
            const token = backendAssets?.find(
              a => a.assetId === row.assetId
            )?.tokenId;
            return (
              <div
                className={`asset-tr${selected?.assetId === row.assetId ? " selected" : ""}`}
                key={row.key}
                onClick={() => setSelectedKey(row.key)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === "Enter") setSelectedKey(row.key);
                }}
              >
                <div>
                  <b>{row.name}</b>
                  <code>{row.assetId}</code>
                </div>
                <span className="status mint">
                  {token ? `#${token}` : "NOT MINTED"}
                </span>
                <span>{row.classification}</span>
                <span>{row.custodian}</span>
                <Status tone={row.statusTone}>{row.status}</Status>
                <time>{row.time}</time>
              </div>
            );
          })}
          {assetsLoading &&
            !filtered.length &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                className="asset-tr row-loading"
                key={`loading-${i}`}
                aria-hidden="true"
              >
                <div>
                  <b>Syncing registry…</b>
                  <code>awaiting backend</code>
                </div>
                <span>—</span>
                <span>—</span>
                <Status tone="muted">LOADING</Status>
                <time>—</time>
              </div>
            ))}
          {!assetsLoading && !filtered.length && (
            <div className="table-empty">
              <div>
                <Eyebrow>NO MATCHING ASSETS</Eyebrow>
                <p>
                  {query
                    ? `No assets match “${query}”. Clear the search to see the full registry.`
                    : assetsSource === "live"
                      ? "No controlled assets are registered yet. Use Register Asset to create the first record."
                      : "Sign in to load the live asset registry."}
                </p>
                {query && (
                  <Action kind="text" onClick={() => setQuery("")}>
                    Clear search
                  </Action>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {!!assetsError && (
        <p className="panel-note" role="alert">
          Asset registry unavailable (
          {String(
            (assetsError as { message?: string }).message ?? "network error"
          )}
          ). {user ? "Retry shortly." : "Sign in to load live data."}
        </p>
      )}
      {selected && (
        <div className="provenance-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <Eyebrow>SELECTED ASSET / {selected.assetId}</Eyebrow>
              <h2>{selected.name}</h2>
              <p>
                {selected.classification} · token{" "}
                <code>{selected.tokenId ?? "not minted"}</code> · custodian{" "}
                <code>{selectedCustodian?.displayName ?? "—"}</code>
              </p>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {isAdmin && (
                <Action
                  onClick={() => {
                    setAssignTarget(selected.custodianIdentityId ?? "");
                    setShowAssign(true);
                  }}
                  disabled={assignMutation.isPending}
                >
                  Assign Custody
                </Action>
              )}
              {isAdmin && selected.status !== "ACTIVE" && (
                <Action
                  onClick={() =>
                    statusMutation.mutate({
                      assetId: selected.id,
                      status: "ACTIVE",
                    })
                  }
                  disabled={statusMutation.isPending}
                >
                  Activate
                </Action>
              )}
              {isAdmin && selected.status === "ACTIVE" && (
                <Action
                  kind="text"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Suspend ${selected.assetId}? Suspended assets are frozen on-chain.`
                      )
                    )
                      statusMutation.mutate({
                        assetId: selected.id,
                        status: "PENDING",
                      });
                  }}
                  disabled={statusMutation.isPending}
                >
                  Suspend
                </Action>
              )}
              {isAdmin && selected.status !== "REVOKED" && (
                <Action
                  kind="text"
                  disabled={statusMutation.isPending}
                  title="Retire this asset: its status becomes REVOKED and it is frozen on-chain. This cannot be undone."
                  onClick={() => {
                    if (
                      window.confirm(
                        "Retire " +
                          selected.assetId +
                          "? The asset becomes REVOKED and is frozen on-chain. This cannot be undone."
                      )
                    ) {
                      statusMutation.mutate({
                        assetId: selected.id,
                        status: "REVOKED",
                      });
                    }
                  }}
                >
                  Retire Asset
                </Action>
              )}
            </div>
          </div>
          {assetDetail?.custody?.length ? (
            <div
              className="sampraan-table-wrap"
              style={{ marginTop: 14, maxHeight: 300, overflow: "auto" }}
            >
              <table className="sampraan-table">
                <thead>
                  <tr>
                    <th>CUSTODY EVENT</th>
                    <th>CUSTODIAN</th>
                    <th>EVIDENCE</th>
                    <th>WHEN</th>
                  </tr>
                </thead>
                <tbody>
                  {assetDetail.custody.map((c, i) => {
                    const custodian = identities?.find(
                      x => x.id === c.custodianIdentityId
                    );
                    return (
                      <tr key={c.id ?? i}>
                        <td>{c.endedAt ? "RELEASED" : "HELD"}</td>
                        <td
                          className="truncate"
                          style={{ maxWidth: 170 }}
                          title={custodian?.displayName}
                        >
                          {custodian?.displayName ?? "—"}
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <span
                            className="truncate"
                            style={{ display: "block" }}
                            title={c.reason ?? c.id ?? undefined}
                          >
                            {c.reason ?? c.id}
                          </span>
                        </td>
                        <td>{formatClock(c.startedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="panel-note">
              No custody history rows yet — assignment/transfer operations will
              record evidence here.
            </p>
          )}
          {isAuthenticated && actorDid && (
            <AssetWorkspace
              assetId={selected.id}
              assetName={selected.name}
              actorDid={actorDid}
            />
          )}
          {isAuthenticated && !actorDid && (
            <p className="panel-note" style={{ marginTop: 14 }}>
              Controlled content operations require a SAMPRAAN identity linked
              to your session — the backend resolves content authorization per
              identity, per operation.
            </p>
          )}
        </div>
      )}
      {showCreate && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Register asset"
          onClick={e => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="sampraan-dialog">
            <div className="sampraan-dialog-head">
              <div>
                <Eyebrow>ASSET ADMINISTRATION</Eyebrow>
                <h2>Register controlled asset</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={submitCreate} noValidate>
              <div className="form-grid-2">
                <div className="sampraan-field">
                  <label className="sampraan-label" htmlFor="as-id">
                    ASSET ID (UNIQUE)
                  </label>
                  <input
                    id="as-id"
                    className="sampraan-input"
                    value={form.assetId}
                    onChange={e =>
                      setForm(f => ({ ...f, assetId: e.target.value }))
                    }
                    placeholder="BEL-FW-2026-014"
                    aria-invalid={!!formErrors.assetId}
                  />
                  {formErrors.assetId && (
                    <p className="sampraan-field-error" role="alert">
                      {formErrors.assetId}
                    </p>
                  )}
                </div>
                <div className="sampraan-field">
                  <label className="sampraan-label" htmlFor="as-type">
                    TYPE
                  </label>
                  <input
                    id="as-type"
                    className="sampraan-input"
                    value={form.type}
                    onChange={e =>
                      setForm(f => ({ ...f, type: e.target.value }))
                    }
                    placeholder="FIRMWARE / DOCUMENT / INSTRUMENT"
                    aria-invalid={!!formErrors.type}
                  />
                  {formErrors.type && (
                    <p className="sampraan-field-error" role="alert">
                      {formErrors.type}
                    </p>
                  )}
                </div>
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="as-name">
                  NAME
                </label>
                <input
                  id="as-name"
                  className="sampraan-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Restricted Firmware Package"
                  aria-invalid={!!formErrors.name}
                />
                {formErrors.name && (
                  <p className="sampraan-field-error" role="alert">
                    {formErrors.name}
                  </p>
                )}
              </div>
              <div className="form-grid-2">
                <div className="sampraan-field">
                  <label className="sampraan-label" htmlFor="as-class">
                    CLASSIFICATION
                  </label>
                  <select
                    id="as-class"
                    className="sampraan-select"
                    value={form.classification}
                    onChange={e =>
                      setForm(f => ({ ...f, classification: e.target.value }))
                    }
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="CONTROLLED">CONTROLLED</option>
                    <option value="SENSITIVE">SENSITIVE</option>
                    <option value="HIGHLY_SENSITIVE">HIGHLY_SENSITIVE</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div className="sampraan-field">
                  <label className="sampraan-label" htmlFor="as-status">
                    INITIAL STATUS
                  </label>
                  <select
                    id="as-status"
                    className="sampraan-select"
                    value={form.status}
                    onChange={e =>
                      setForm(f => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="as-cust">
                  OWNER / CUSTODIAN IDENTITY
                </label>
                <select
                  id="as-cust"
                  className="sampraan-select"
                  value={form.custodianIdentityId}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      custodianIdentityId: e.target.value,
                    }))
                  }
                  aria-invalid={!!formErrors.custodianIdentityId}
                >
                  {
                    <option value="" disabled>
                      Select an ACTIVE identity…
                    </option>
                  }
                  {(identities ?? [])
                    .filter(i => i.status === "ACTIVE")
                    .map(i => (
                      <option key={i.id} value={i.id}>
                        {i.displayName} · {shortDid(i.did)}
                      </option>
                    ))}
                </select>
                {formErrors.custodianIdentityId && (
                  <p className="sampraan-field-error" role="alert">
                    {formErrors.custodianIdentityId}
                  </p>
                )}
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="as-int">
                  INTEGRITY HASH (OPTIONAL, e.g. sha256:…)
                </label>
                <input
                  id="as-int"
                  className="sampraan-input"
                  value={form.integrityHash}
                  onChange={e =>
                    setForm(f => ({ ...f, integrityHash: e.target.value }))
                  }
                  placeholder="sha256:…"
                />
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="as-desc">
                  DESCRIPTION
                </label>
                <textarea
                  id="as-desc"
                  className="sampraan-input"
                  rows={3}
                  value={form.description}
                  onChange={e =>
                    setForm(f => ({ ...f, description: e.target.value }))
                  }
                  placeholder="What this asset represents (kept off-chain; only digests are anchored)."
                />
              </div>
              <p className="panel-note">
                Submission validates server-side, requires an admin session,
                writes the registry row, then mints the asset as a restricted
                ERC-721 NFT on the Besu chain. Only digests go on-chain — never
                document contents.
              </p>
              <div className="sampraan-dialog-actions">
                <Action type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Action>
                <Action
                  kind="solid"
                  type="submit"
                  disabled={register.isPending}
                >
                  {register.isPending
                    ? "MINTING ON-CHAIN…"
                    : "REGISTER / MINT ASSET"}
                </Action>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAssign && selected && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Assign custody"
          onClick={e => {
            if (e.target === e.currentTarget) setShowAssign(false);
          }}
        >
          <div className="sampraan-dialog">
            <div className="sampraan-dialog-head">
              <div>
                <Eyebrow>CUSTODY ASSIGNMENT</Eyebrow>
                <h2>Assign {selected.assetId}</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setShowAssign(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="sampraan-field">
              <label className="sampraan-label" htmlFor="as-assign-target">
                NEW CUSTODIAN (must be ACTIVE on-chain)
              </label>
              <select
                id="as-assign-target"
                className="sampraan-select"
                value={assignTarget}
                onChange={e => setAssignTarget(e.target.value)}
              >
                {(identities ?? [])
                  .filter(i => i.status === "ACTIVE")
                  .map(i => (
                    <option key={i.id} value={i.id}>
                      {i.displayName} · {shortDid(i.did)}
                    </option>
                  ))}
              </select>
            </div>
            <p className="panel-note">
              The smart contract independently re-verifies the operator role and
              that the recipient identity is registered and ACTIVE on-chain.
              Read model + custody history update only after confirmation.
            </p>
            <div className="sampraan-dialog-actions">
              <Action type="button" onClick={() => setShowAssign(false)}>
                Cancel
              </Action>
              <Action
                kind="solid"
                disabled={assignMutation.isPending || !assignTarget}
                onClick={() =>
                  assignMutation.mutate({
                    assetId: selected.id,
                    custodianIdentityId: assignTarget,
                  })
                }
              >
                {assignMutation.isPending
                  ? "SUBMITTING TO CHAIN…"
                  : "ASSIGN CUSTODY"}
              </Action>
            </div>
          </div>
        </div>
      )}
      {txDetail && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction evidence"
          onClick={e => {
            if (e.target === e.currentTarget) setTxDetail(null);
          }}
        >
          <div className="sampraan-dialog">
            <div className="sampraan-dialog-head">
              <div>
                <Eyebrow>ON-CHAIN EVIDENCE</Eyebrow>
                <h2>NFT MINTED ✓</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setTxDetail(null)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="evidence-block">
              <h4>{txDetail.assetId}</h4>
              <div className="decision-proof">
                <div>
                  <span>TX HASH</span>
                  <CopyChip value={txDetail.hash} label="tx hash" full />
                </div>
                <div>
                  <span>BLOCK</span>
                  <code>
                    #{txDetail.block ? formatCount(txDetail.block) : "pending"}
                  </code>
                </div>
                <div>
                  <span>NETWORK</span>
                  <code>SAMPRAAN-LOCAL-QBFT / CHAIN ID 4224</code>
                </div>
                <div>
                  <span>EVIDENCE</span>
                  <code>
                    QBFT immediate finality — receipt retrievable by hash
                  </code>
                </div>
              </div>
            </div>
            <div className="sampraan-dialog-actions">
              <Action kind="solid" onClick={() => setTxDetail(null)}>
                Close
              </Action>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function AuditPage() {
  const {
    data: events,
    isLoading: auditLoading,
    error: auditError,
    source: auditSource,
  } = useAuditEvents();
  const { data: identities } = useIdentities();
  const { user } = useAuth();
  const [decisionFilter, setDecisionFilter] = useState<
    "ALL" | "ALLOW" | "DENY" | "CHALLENGE"
  >("ALL");
  const [textQuery, setTextQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [txInspect, setTxInspect] = useState<string | null>(null);
  const rows = useMemo(
    () => toAuditRows(events, identities),
    [events, identities]
  );
  const chainRows = (events ?? []).filter(
    ev => ev.source === "CHAIN_READ_MODEL"
  );
  const usingDemo = !rows.length;
  const q = textQuery.trim().toUpperCase();
  const shown = usingDemo
    ? []
    : rows.filter(
        row =>
          (decisionFilter === "ALL" ||
            row.decision === decisionLabel(decisionFilter)) &&
          (!q ||
            [row.actor, row.did, row.action, row.resource].some(v =>
              v.toUpperCase().includes(q)
            ))
      );
  const decisionCycle = () =>
    setDecisionFilter(current =>
      current === "ALL"
        ? "DENY"
        : current === "DENY"
          ? "CHALLENGE"
          : current === "CHALLENGE"
            ? "ALLOW"
            : "ALL"
    );
  const sourceEyebrow = usingDemo
    ? "EVIDENCE / DEMO STREAM"
    : "EVIDENCE / LIVE STREAM";
  const { data: txDetail, isFetching: txLoading } =
    trpc.blockchain.transaction.useQuery(
      { transactionHash: txInspect ?? "" },
      {
        enabled: !!txInspect && /^0x[0-9a-fA-F]{64}$/.test(txInspect),
        retry: false,
      }
    );
  const exportEvidence = () => {
    if (!events?.length) {
      toast.warning("No evidence to export", {
        description: "Perform real operations first.",
      });
      return;
    }
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sampraan-audit-evidence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Evidence exported", {
      description: `${events.length} audit record(s) exported as JSON (metadata only, no secrets).`,
    });
  };
  const copyHash = (hash: string) => {
    void navigator.clipboard?.writeText(hash);
    toast.success("Transaction hash copied");
  };
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>TRUST FABRIC / {sourceEyebrow}</Eyebrow>
          <h1>Audit Evidence</h1>
          <p>
            Forensic visibility into every identity, policy, asset, and chain
            event.
          </p>
        </div>
        <Action
          onClick={exportEvidence}
          title="Export the current live evidence stream as JSON"
        >
          <Terminal size={15} /> Export evidence
        </Action>
      </div>
      <div className="filter-row">
        <label
          className="table-search"
          htmlFor="audit-search"
          style={{ marginRight: 4 }}
        >
          <Search size={14} aria-hidden="true" />
          <input
            id="audit-search"
            type="search"
            placeholder="Search actor, DID, action, resource"
            value={textQuery}
            onChange={e => setTextQuery(e.target.value)}
            aria-label="Search audit evidence"
          />
        </label>
        <button
          type="button"
          onClick={decisionCycle}
          className={decisionFilter !== "ALL" ? "active" : ""}
          title="Cycle the decision filter across the recorded evidence"
        >
          Decision:{" "}
          {decisionFilter === "ALL" ? "ALL" : decisionLabel(decisionFilter)}
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          className={chainRows.length ? "active" : ""}
          disabled={!chainRows.length}
          title="Chain-projected events come from the indexer (source=CHAIN_READ_MODEL)"
        >
          On-chain events: {chainRows.length}
        </button>
      </div>
      <div className="audit-table-panel">
        <div className="audit-head">
          <span>TIMESTAMP</span>
          <span>ACTOR / DID</span>
          <span>ACTION</span>
          <span>RESOURCE</span>
          <span>DECISION</span>
          <span>TX HASH / BLOCK</span>
          <span>SOURCE</span>
        </div>
        {shown.map(row => {
          const ev = (events ?? []).find(e => e.id === row.key);
          const onChain =
            ev?.source === "CHAIN_READ_MODEL" || !!ev?.transactionHash;
          const expanded = expandedKey === row.key;
          return (
            <Fragment key={row.key}>
              <div
                className={`audit-row ${expanded ? "expanded" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedKey(expanded ? null : row.key)}
                onKeyDown={e => {
                  if (e.key === "Enter")
                    setExpandedKey(expanded ? null : row.key);
                }}
                aria-expanded={expanded}
              >
                <time title={row.fullTime}>{row.time}</time>
                <div>
                  <b className="truncate" title={row.actor}>
                    {row.actor}
                  </b>
                  <code className="truncate" title={row.did}>
                    {row.did}
                  </code>
                </div>
                <span className="truncate" title={row.action}>
                  {row.action}
                </span>
                <span className="truncate" title={row.resource}>
                  {row.resource}
                </span>
                <Status tone={row.decisionTone}>{row.decision}</Status>
                <code
                  className="truncate"
                  style={{
                    cursor: ev?.transactionHash ? "pointer" : "",
                    maxWidth: "100%",
                  }}
                  onClick={e => {
                    if (ev?.transactionHash) {
                      e.stopPropagation();
                      copyHash(ev.transactionHash);
                    }
                  }}
                  title={
                    ev?.transactionHash
                      ? "Click to copy the full hash — expand the row for full evidence"
                      : "No on-chain transaction for this record"
                  }
                >
                  {row.tx}
                </code>
                <span
                  className={`onchain-tag ${onChain ? "" : "off"}`}
                  title={
                    ev?.source === "CHAIN_READ_MODEL"
                      ? "Projected by the chain-event indexer"
                      : onChain
                        ? "Confirmed on-chain — tx hash recorded"
                        : "Off-chain application decision"
                  }
                >
                  {onChain ? "ON-CHAIN" : "OFF-CHAIN"}
                </span>
              </div>
              {expanded && (
                <div className="audit-row-detail">
                  <div>
                    <span>DECISION</span>
                    <b>{row.decision}</b>
                  </div>
                  <div>
                    <span>REASON</span>
                    <b>{row.reason ?? "No reason recorded for this event."}</b>
                  </div>
                  <div>
                    <span>RESOURCE</span>
                    <b>{row.resource}</b>
                  </div>
                  <div>
                    <span>SOURCE</span>
                    <b>{row.source ?? "—"}</b>
                  </div>
                  <div>
                    <span>TX HASH</span>
                    {row.txHash ? (
                      <CopyChip value={row.txHash} label="tx hash" full />
                    ) : (
                      <b>— not anchored —</b>
                    )}
                  </div>
                  <div>
                    <span>BLOCK</span>
                    <b>{row.block ? `#${formatCount(row.block)}` : "—"}</b>
                  </div>
                  <div>
                    <span>FULL TIME</span>
                    <b>{row.fullTime}</b>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
        {auditLoading &&
          !shown.length &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              className="audit-row row-loading"
              key={`loading-${i}`}
              aria-hidden="true"
            >
              <time>—</time>
              <div>
                <b>Syncing evidence stream…</b>
                <code>awaiting backend</code>
              </div>
              <span>—</span>
              <span>—</span>
              <Status tone="muted">LOADING</Status>
              <code>—</code>
              <span>—</span>
            </div>
          ))}
        {!auditLoading && !shown.length && (
          <div className="table-empty">
            <div>
              <Eyebrow>NO EVIDENCE RECORDED</Eyebrow>
              <p>
                {usingDemo
                  ? user
                    ? "No audit events recorded yet. Perform a real operation — register an identity, mint an asset, request a transfer — to generate evidence."
                    : "Sign in to load the live evidence stream; unauthenticated visitors see no audit data."
                  : decisionFilter !== "ALL"
                    ? `No events match the ${decisionLabel(decisionFilter)} decision filter. Switch back to ALL to see the full stream.`
                    : q
                      ? `No events match “${textQuery.trim()}”. Clear the search to see the full stream.`
                      : "No audit events have been recorded yet."}
              </p>
              {(decisionFilter !== "ALL" || q) && (
                <Action
                  kind="text"
                  onClick={() => {
                    setDecisionFilter("ALL");
                    setTextQuery("");
                  }}
                >
                  Clear filters
                </Action>
              )}
            </div>
          </div>
        )}
      </div>
      {!!auditError && (
        <p className="panel-note" role="alert">
          Audit evidence stream unavailable (
          {String(
            (auditError as { message?: string }).message ?? "network error"
          )}
          ). {user ? "Retry shortly." : "Sign in to load live evidence."}
        </p>
      )}
      {auditSource === "live" && rows.length > 0 && (
        <p className="panel-note">
          Showing {rows.length} live evidence record
          {rows.length === 1 ? "" : "s"} from the protected audit.list procedure
          · {chainRows.length} projected from chain events by the indexer.
        </p>
      )}
      {txInspect && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction evidence"
          onClick={e => {
            if (e.target === e.currentTarget) setTxInspect(null);
          }}
        >
          <div className="sampraan-dialog">
            <div className="sampraan-dialog-head">
              <div>
                <Eyebrow>ON-CHAIN TRANSACTION DETAIL</Eyebrow>
                <h2>Receipt evidence</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setTxInspect(null)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            {txLoading ? (
              <div className="module-record row-loading">
                FETCHING RECEIPT FROM BESU…
              </div>
            ) : txDetail ? (
              <div className="evidence-block">
                <div className="decision-proof">
                  {Object.entries(txDetail)
                    .filter(([k]) => k !== "events")
                    .map(([k, v]) => (
                      <div key={k}>
                        <span>{k.toUpperCase()}</span>
                        <code>{String(v)}</code>
                      </div>
                    ))}
                </div>
                {!!txDetail.events &&
                  Object.keys(txDetail.events).length > 0 && (
                    <>
                      <h4>CONTRACT EVENTS</h4>
                      <div className="decision-proof">
                        {Object.entries(txDetail.events).map(([name, ev]) => (
                          <div key={name}>
                            <span>{name}</span>
                            <code>
                              {JSON.stringify(
                                (ev as { args?: unknown }).args ?? ev
                              )}
                            </code>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </div>
            ) : (
              <p className="panel-note" role="alert">
                Receipt not found for this hash. The chain may have restarted
                since the transaction — the audit record remains the evidence of
                the decision.
              </p>
            )}
            <div className="sampraan-dialog-actions">
              <Action kind="solid" onClick={() => setTxInspect(null)}>
                Close
              </Action>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function IntelligencePage() {
  const { data: alerts, isLoading: alertsLoading } = useSecurityAlerts();
  const { data: events } = useAuditEvents();
  const { data: identities } = useIdentities();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const metrics = useMemo(() => alertMetrics(alerts), [alerts]);
  const scan = trpc.intelligence.scan.useMutation({
    onSuccess: result => {
      void utils.alerts.invalidate();
      void utils.audit.invalidate();
      toast.success("Advisory scan complete", {
        description: `${result.scanned} events scanned · ${result.created} alert(s) created · ${result.suppressed} duplicate(s) suppressed.`,
      });
    },
    onError: error =>
      toast.error("Scan failed", { description: error.message }),
  });
  const live = !!alerts?.length;
  const riskValue =
    metrics.maxRisk !== null ? String(metrics.maxRisk) : live ? "0" : "—";
  const riskTone: Tone =
    (metrics.maxRisk ?? 0) >= 70
      ? "red"
      : (metrics.maxRisk ?? 0) >= 40
        ? "amber"
        : "mint";
  const deniedEvents = (events ?? []).filter(
    ev => ev.action === "AUTHORIZATION_DENIED"
  );
  const byId = useMemo(() => identityMap(identities), [identities]);
  const timeline = deniedEvents.slice(0, 6).map((ev, i) => ({
    key: ev.id ?? String(i),
    time: formatClock(ev.timestamp),
    label: ev.action.replace(/_/g, " "),
    sub: [
      ev.resourceId ?? ev.resourceType,
      byId.get(ev.actorIdentityId ?? "")?.displayName ?? "unattributed",
    ]
      .filter(Boolean)
      .join(" / "),
    tone: decisionTone(ev.decision),
  }));
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>SECURITY / SIGNAL WORKSPACE</Eyebrow>
          <h1>Security Signals</h1>
          <p>
            Rule-based signals raised from real audit events. Advisory only —
            never a substitute for policy.
          </p>
        </div>
        <Status tone="amber">
          RULE ENGINE · ADVISORY ONLY · NO AI SCORING
        </Status>
      </div>
      <div className="intel-top">
        <Metric
          label="OPEN SIGNALS"
          value={
            alertsLoading ? "…" : String(metrics.openCount).padStart(2, "0")
          }
          sub={
            metrics.openCount ? "RULE-BASED · NEEDS REVIEW" : "NOTHING RAISED"
          }
          tone={metrics.openCount ? "amber" : "mint"}
        />
        <Metric
          label="UNDER INVESTIGATION"
          value={
            alertsLoading
              ? "…"
              : String(metrics.investigatingCount).padStart(2, "0")
          }
          sub="ANALYST-TRACKED SIGNALS"
        />
        <Metric
          label="HIGHEST RULE RISK"
          value={alertsLoading ? "…" : riskValue}
          sub={
            metrics.maxRisk !== null
              ? metrics.maxRisk >= 70
                ? "SEVERE (RULE RISK)"
                : metrics.maxRisk >= 40
                  ? "ELEVATED"
                  : "NOMINAL"
              : live
                ? "NO OPEN SIGNALS"
                : "NO SIGNALS YET"
          }
          tone={riskTone}
        />
        <Metric
          label="DENIED OPERATIONS"
          value={
            alertsLoading ? "…" : String(deniedEvents.length).padStart(2, "0")
          }
          sub={
            deniedEvents.length ? "REAL AUTHORIZATION DENIALS" : "NONE RECORDED"
          }
          tone={deniedEvents.length ? "amber" : "mint"}
        />
      </div>
      <div className="investigation-grid">
        <section className="workspace-panel">
          <PanelHead
            eyebrow={
              timeline.length
                ? "BEHAVIOURAL TIMELINE / REAL DENIALS"
                : "BEHAVIOURAL TIMELINE"
            }
            title="Authorization denial timeline"
          />
          <div className="investigation-timeline">
            {timeline.length ? (
              timeline.map(t => (
                <div key={t.key}>
                  <time>{t.time}</time>
                  <i className={t.tone} />
                  <div>
                    <b>{t.label}</b>
                    <small>{t.sub}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="panel-note">
                No authorization denials recorded yet. Denied operations (e.g.
                an Auditor transfer attempt) appear here in real time.
              </p>
            )}
          </div>
        </section>
        <section className="workspace-panel explanation">
          <PanelHead
            eyebrow="RULES-FIRST ENGINE · DETERMINISTIC"
            title="How a signal is derived"
          />
          <p>
            Signals derive from REAL audit events: R1 repeated authorization
            denials (≥3 per actor), R2 activity from revoked/suspended
            identities, R3 blockchain submission failures. These are
            deterministic rules — not AI/ML analysis — and nothing here
            overrides authorization.
          </p>
          <div className="signal-tags">
            {deniedEvents.length >= 3 && (
              <Status tone="red">REPEATED FAILURES</Status>
            )}
            {metrics.highRiskIdentities > 0 && (
              <Status tone="red">REVOKED-IDENTITY ACTIVITY</Status>
            )}
            {alerts?.some(a => a.title.includes("Blockchain")) && (
              <Status tone="amber">CHAIN FAILURES</Status>
            )}
            {deniedEvents.length === 0 && (
              <Status tone="mint">NO ACTIVE SIGNALS</Status>
            )}
          </div>
          <div className="advisory-note">
            <ShieldAlert size={18} />
            <span>
              <b>ADVISORY ONLY</b> These signals never authorize or block a
              transaction. The policy engine and smart contracts remain the only
              decision-makers.
            </span>
          </div>
          <Action
            kind="solid"
            disabled={scan.isPending || !user}
            onClick={() => scan.mutate()}
            title={
              user
                ? "Run the advisory rule scan over real audit events"
                : "Sign in to run the scan"
            }
          >
            {scan.isPending ? "SCANNING…" : "RUN ADVISORY SCAN"}{" "}
            <ArrowRight size={15} />
          </Action>
          {!user && (
            <p className="panel-note">
              Sign in to run scans against the live audit stream.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  sub,
  tone = "mint",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
}) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>
        <i className={tone} />
        {sub}
      </small>
    </div>
  );
}
function AlertPage() {
  const {
    data: alerts,
    isLoading: alertsLoading,
    error: alertsError,
  } = useSecurityAlerts();
  const { data: events } = useAuditEvents();
  const { data: identities } = useIdentities();
  const utils = trpc.useUtils();
  const openCount =
    alerts?.filter(alert => alert.status === "OPEN").length ?? 0;
  const alert = useMemo(() => primaryAlert(alerts), [alerts]);
  const byId = useMemo(() => identityMap(identities), [identities]);
  const actor = alert?.identityId ? byId.get(alert.identityId) : undefined;
  const eventChain = useMemo(
    () =>
      (events ?? [])
        .filter(
          event =>
            !alert?.identityId || event.actorIdentityId === alert.identityId
        )
        .slice(0, 6),
    [events, alert]
  );
  const statusMutation = trpc.alerts.setStatus.useMutation({
    onSuccess: updated => {
      void utils.alerts.invalidate();
      void utils.audit.invalidate();
      toast.success("Alert status updated", {
        description: `Advisory alert marked ${updated.status}. This never affects authorization.`,
      });
    },
    onError: error =>
      toast.error("Alert update failed", { description: error.message }),
  });
  const chainRows = eventChain.length
    ? eventChain.map((event, index) => ({
        key: event.id ?? `chain-${index}`,
        label: event.action.replace(/_/g, " "),
        sub: [
          event.resourceId ?? event.resourceType,
          decisionLabel(event.decision),
        ]
          .filter(Boolean)
          .join(" / "),
        time: formatClock(event.timestamp),
        tone: decisionTone(event.decision),
      }))
    : [];
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>SECURITY / ALERT INVESTIGATION</Eyebrow>
          <h1>Alerts</h1>
          <p>
            Investigate risk with the full chain of identity, action, asset, and
            evidence.
          </p>
        </div>
        <Status tone={alertsLoading ? "muted" : openCount ? "red" : "mint"}>
          {alertsLoading
            ? "SYNCING…"
            : openCount
              ? `${String(openCount).padStart(2, "0")} ACTIVE`
              : "NO ACTIVE ALERTS"}
        </Status>
      </div>
      {alertsLoading && !alert ? (
        <div className="alert-layout">
          <section className="alert-hero row-loading">
            <div className="alert-severity">
              <ShieldAlert size={22} />
              <span>SYNCING…</span>
            </div>
            <Eyebrow>ALERT REGISTRY / LIVE</Eyebrow>
            <h2>Retrieving alert registry…</h2>
            <div className="alert-context">
              <span>
                RISK<strong>—</strong>
              </span>
              <span>
                ACTOR<code>—</code>
              </span>
              <span>
                ASSET<strong>—</strong>
              </span>
            </div>
          </section>
          <section className="workspace-panel">
            <PanelHead
              eyebrow="EVENT CHAIN"
              title="Event chain for this alert"
            />
            <div className="alert-timeline">
              <div>
                <span className="mint" />
                <div>
                  <b>Syncing evidence…</b>
                  <small>awaiting backend</small>
                </div>
                <time>—</time>
              </div>
            </div>
          </section>
        </div>
      ) : !alert ? (
        <div className="alert-layout">
          <section className="alert-hero">
            <div className="alert-severity">
              <ShieldCheck size={22} />
              <span>FABRIC QUIET</span>
            </div>
            <Eyebrow>
              ALERT REGISTRY / {alertsError ? "UNAVAILABLE" : "EMPTY"}
            </Eyebrow>
            <h2>No alerts on record.</h2>
            <div className="alert-context">
              <span>
                RISK<strong>0</strong>
              </span>
              <span>
                OPEN<strong>0</strong>
              </span>
              <span>
                STATUS<strong className="ok">NOMINAL</strong>
              </span>
            </div>
            {!!alertsError && (
              <p className="panel-note" role="alert">
                Alert registry unavailable (
                {String(
                  (alertsError as { message?: string }).message ??
                    "network error"
                )}
                ). The workspace remains operational.
              </p>
            )}
          </section>
          <section className="workspace-panel">
            <PanelHead
              eyebrow="EVENT CHAIN"
              title="Event chain for this alert"
            />
            <div className="alert-timeline">
              <div>
                <span className="mint" />
                <div>
                  <b>Registry sync</b>
                  <small>no elevated signals recorded</small>
                </div>
                <time>—</time>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="alert-layout">
          <section className="alert-hero">
            <div className="alert-severity">
              <ShieldAlert size={22} />
              <span>{alert.severity} RISK</span>
            </div>
            <Eyebrow>ALERT / {formatTimestamp(alert.createdAt)}</Eyebrow>
            <h2>{alert.title}</h2>
            <div className="alert-context">
              <span>
                RISK<strong>{alert.riskScore ?? "—"}</strong>
              </span>
              <span>
                ACTOR<code>{actor ? shortDid(actor.did) : "—"}</code>
              </span>
              <span>
                STATUS<strong>{alert.status}</strong>
              </span>
            </div>
            <p className="panel-note">{alert.description}</p>
            <div className="alert-actions">
              <Action
                kind="solid"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    alertId: alert.id,
                    status: "INVESTIGATING",
                  })
                }
              >
                {statusMutation.isPending
                  ? "UPDATING…"
                  : alert.status === "OPEN"
                    ? "Begin investigation"
                    : "Mark INVESTIGATING"}{" "}
                <ArrowRight size={15} />
              </Action>
              <Action
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    alertId: alert.id,
                    status: "RESOLVED",
                  })
                }
              >
                Resolve (advisory)
              </Action>
            </div>
          </section>
          <section className="workspace-panel">
            <PanelHead
              eyebrow={
                eventChain.length
                  ? "EVENT CHAIN / LIVE EVIDENCE"
                  : "EVENT CHAIN"
              }
              title="Event chain for this alert"
            />
            <div className="alert-timeline">
              {chainRows.length ? (
                chainRows.map(row => (
                  <div key={row.key}>
                    <span className={row.tone} />
                    <div>
                      <b>{row.label}</b>
                      <small>{row.sub}</small>
                    </div>
                    <time>{row.time}</time>
                  </div>
                ))
              ) : (
                <p className="panel-note">
                  No linked audit events for this alert's actor yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function AdministrationPage() {
  const { user } = useAuth();
  const { data: rolesCatalog, isLoading: rolesLoading } =
    trpc.identities.roles.useQuery(undefined, { enabled: !!user, retry: 1 });
  const { data: identities } = useIdentities();
  const { data: alerts } = useSecurityAlerts();
  const isAdmin = user?.role === "admin";
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>GOVERNANCE / CONTROL PLANE</Eyebrow>
          <h1>Administration</h1>
          <p>
            Role catalog, permission matrix, and alert governance — all
            server-side.
          </p>
        </div>
        <Status>
          {isAdmin ? "ADMIN SESSION" : "READ-ONLY / SIGN IN AS ADMIN"}
        </Status>
      </div>
      {!user && (
        <p className="panel-note" role="alert">
          Sign in to load the live governance catalog. Unauthenticated visitors
          see no governance data.
        </p>
      )}
      {rolesLoading && (
        <div className="module-record row-loading">SYNCING ROLE CATALOG…</div>
      )}
      {rolesCatalog && (
        <div className="evidence-block">
          <h4>ROLE / PERMISSION MATRIX (FROM DATABASE)</h4>
          <div className="sampraan-table-wrap">
            <table className="sampraan-table">
              <thead>
                <tr>
                  <th>ROLE</th>
                  <th>PERMISSIONS</th>
                  <th>ASSIGNED IDENTITIES</th>
                </tr>
              </thead>
              <tbody>
                {rolesCatalog.map(role => (
                  <tr key={role.id}>
                    <td>
                      <span className="role-chip">{role.name}</span>
                    </td>
                    <td>
                      {(role.permissions ?? []).map(p => (
                        <code
                          key={p}
                          style={{
                            display: "inline-block",
                            margin: "1px 6px 1px 0",
                          }}
                        >
                          {p}
                        </code>
                      ))}
                    </td>
                    <td>
                      {identities?.filter(i => i.roles?.includes(role.name))
                        .length ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="panel-note">
            Roles are assigned from the Identity page (RBAC administration
            dialog) by a platform admin; every change is audited and effective
            on the next operation.
          </p>
        </div>
      )}
      {alerts && (
        <div className="evidence-block" style={{ marginTop: 18 }}>
          <h4>ADVISORY ALERT GOVERNANCE</h4>
          <div className="sampraan-table-wrap">
            <table className="sampraan-table">
              <thead>
                <tr>
                  <th>ALERT</th>
                  <th>SEVERITY</th>
                  <th>RISK</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 6).map(a => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>
                      <Status tone={severityTone(a.severity)}>
                        {a.severity}
                      </Status>
                    </td>
                    <td>{a.riskScore ?? "—"}</td>
                    <td>
                      <Status tone={alertStatusTone(a.status)}>
                        {a.status}
                      </Status>
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 && (
                  <tr>
                    <td colSpan={4}>No advisory alerts recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="panel-note">
            Alerts are advisory only — they never participate in authorization.
            Manage individual alerts from the Alerts page.
          </p>
        </div>
      )}
    </div>
  );
}
function SettingsPage() {
  const { data: chain } = useBlockchainStatus();
  const { user } = useAuth();
  return (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>GOVERNANCE / SETTINGS</Eyebrow>
          <h1>Settings</h1>
          <p>
            Network, contract, and session configuration — read-only surfaces of
            real state.
          </p>
        </div>
        <Status>
          {chain?.connected ? "NETWORK HEALTHY" : "NETWORK OFFLINE"}
        </Status>
      </div>
      <div className="evidence-block">
        <h4>BESU QBFT NETWORK</h4>
        <div className="decision-proof">
          <div>
            <span>NETWORK</span>
            <code>{chain?.network ?? "—"}</code>
          </div>
          <div>
            <span>CHAIN ID</span>
            <code>
              {chain?.chainId ?? "—"} (mismatch refuses contract binding)
            </code>
          </div>
          <div>
            <span>LATEST BLOCK</span>
            <code>{formatCount(chain?.latestBlock)}</code>
          </div>
          <div>
            <span>NODE</span>
            <code>{chain?.nodeVersion ?? "—"}</code>
          </div>
          <div>
            <span>MODE</span>
            <code>
              {chain?.mode ?? "—"} — contract calls are enforced on-chain
            </code>
          </div>
        </div>
      </div>
      <div className="evidence-block" style={{ marginTop: 16 }}>
        <h4>SESSION</h4>
        <div className="decision-proof">
          <div>
            <span>OPERATOR</span>
            <code>{user?.name ?? user?.email ?? "unauthenticated"}</code>
          </div>
          <div>
            <span>PLATFORM ROLE</span>
            <code>{user?.role ?? "—"}</code>
          </div>
          <div>
            <span>SESSION</span>
            <code>httpOnly cookie · server-side tracked · revocable</code>
          </div>
          <div>
            <span>AUTH MODE</span>
            <code>
              local password (scrypt) · OAuth preserved for production
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
function GenericPage({ page }: { page: string }) {
  return page === "Administration" ? (
    <AdministrationPage />
  ) : page === "Settings" ? (
    <SettingsPage />
  ) : (
    <div className="special-page">
      <div className="special-heading">
        <div>
          <Eyebrow>GOVERNANCE / CONTROL PLANE</Eyebrow>
          <h1>{page}</h1>
          <p>
            Review and control SAMPRAAN trust operations with explicit evidence.
          </p>
        </div>
        <Status tone="muted">NO DEDICATED VIEW</Status>
      </div>
      <div className="generic-module">
        <div className="module-visual">
          <Network size={28} />
          <Eyebrow>OPERATIONAL MODULE</Eyebrow>
          <h2>{page} is administered from the pages in the header.</h2>
          <p>
            This module has no dedicated surface in this build. Every operation
            it covers is available, with evidence, through Identity, Access
            Control, Assets, Governance, and Audit Evidence.
          </p>
        </div>
        <div className="module-records">
          <PanelHead
            eyebrow="MODULE INDEX"
            title="Where this is administered"
          />
          <div className="module-record">
            <span>01</span>
            <b>Identity</b>
            <span className="status muted">IDENTITY LIFECYCLE</span>
          </div>
          <div className="module-record">
            <span>02</span>
            <b>Access Control</b>
            <span className="status muted">POLICY DECISIONS</span>
          </div>
          <div className="module-record">
            <span>03</span>
            <b>Assets</b>
            <span className="status muted">REGISTRY AND CUSTODY</span>
          </div>
          <div className="module-record">
            <span>04</span>
            <b>Audit Evidence</b>
            <span className="status muted">FULL TRAIL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function Workspace({ onNeedAuth }: { onNeedAuth?: () => void }) {
  const [page, setPage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) onNeedAuth?.();
  }, [loading, user, onNeedAuth]);
  const content =
    page === "Overview" ? (
      <CommandCenter />
    ) : page === "Identity" ? (
      <IdentityPage />
    ) : page === "Access Control" ? (
      <AccessPage />
    ) : page === "Assets" ? (
      <AssetsPage />
    ) : page === "Governance" ? (
      <GovernancePage />
    ) : page === "Evidence" ? (
      <EvidencePage onNavigate={setPage} />
    ) : page === "Audit Evidence" ? (
      <AuditPage />
    ) : page === "Intelligence" ? (
      <IntelligencePage />
    ) : page === "Alerts" ? (
      <AlertPage />
    ) : (
      <GenericPage page={page} />
    );
  return (
    <div className="workspace">
      <UtilityBar />
      <GovHeader
        page={page}
        setPage={setPage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="workspace-main">
        <main className="workspace-content" id="workspace-main">
          {content}
        </main>
      </div>
    </div>
  );
}
function AuthGate({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { user, isAuthenticated, refetch } = useAuth();
  const utils = trpc.useUtils();
  const { data: authConfig } = trpc.auth.config.useQuery(undefined, {
    retry: false,
  });
  const oauthConfigured = authConfig?.oauthConfigured ?? false;
  const login = trpc.auth.login.useMutation({
    onSuccess: result => {
      setFormError(null);
      toast.success("Signed in", {
        description: `Welcome, ${result.user.name ?? result.user.email} — role ${result.user.role === "admin" ? "ADMIN" : "USER"}.`,
      });
      void refetch();
      void utils.invalidate();
      void utils.auth.me.refetch();
      onSuccess();
    },
    onError: error => {
      const message = error.message || "Authentication failed";
      setFormError(message);
      toast.error("Sign in failed", { description: message });
    },
  });
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (login.isPending) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError("Email is required");
      return;
    }
    if (!password) {
      setFormError("Password is required");
      return;
    }
    setFormError(null);
    login.mutate({ email: trimmed, password });
  };
  const useSecureIdentity = () => {
    if (isAuthenticated) {
      toast.success("Session active", {
        description: `Signed in as ${user?.name ?? user?.email ?? "operator"}. Entering the secure workspace.`,
      });
      onSuccess();
      return;
    }
    if (oauthConfigured) {
      toast.info("Redirecting to identity provider", {
        description:
          "Complete the cryptographic sign-in, then return to the workspace.",
      });
      return;
    }
    toast.info("Email sign-in required", {
      description: "Sign in with your SAMPRAAN account credentials below.",
    });
  };
  return (
    <div className="auth-gate-page">
      <UtilityBar />
      <div className="auth-split">
        <section className="auth-brand">
          <div className="auth-brand-inner">
            <header>
              <Wordmark />
            </header>
            <div className="auth-brand-copy">
              <Eyebrow>SAMPRAAN / SECURE ACCESS</Eyebrow>
              <h2>
                Institutional identity,
                <br />
                <em>verified at the gate.</em>
              </h2>
              <p>
                Roles and permissions are resolved from your account on every
                request — never from this browser.
              </p>
            </div>
            <ul className="auth-brand-points">
              <li>
                <Fingerprint size={16} />
                <span>DID-linked enterprise identity</span>
              </li>
              <li>
                <LockKeyhole size={16} />
                <span>RBAC evaluated server-side</span>
              </li>
              <li>
                <FileCheck2 size={16} />
                <span>Every operation anchored as evidence</span>
              </li>
            </ul>
            <footer>
              <span>PERMISSIONED · VERIFIABLE · ACCOUNTABLE</span>
            </footer>
          </div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-mark">
              <Mark />
            </div>
            <div className="auth-copy">
              <h1>Sign in to SAMPRAAN</h1>
              <p>Authenticate your enterprise identity securely.</p>
            </div>
            {isAuthenticated && (
              <button
                className="auth-identity-button"
                type="button"
                onClick={useSecureIdentity}
                aria-label={`Continue as ${user?.name ?? user?.email ?? "operator"}`}
              >
                <Fingerprint size={17} />
                <span>
                  <b>{`Continue as ${user?.name ?? user?.email ?? "operator"}`}</b>
                  <small>Session verified / recommended</small>
                </span>
                <ArrowRight size={15} />
              </button>
            )}
            {oauthConfigured && !isAuthenticated && (
              <button
                className="auth-identity-button"
                type="button"
                onClick={useSecureIdentity}
              >
                <Fingerprint size={17} />
                <span>
                  <b>DID Authentication</b>
                  <small>Managed identity provider / recommended</small>
                </span>
                <ArrowRight size={15} />
              </button>
            )}
            <form className="auth-form" onSubmit={submit} noValidate>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="sampraan-email">
                  EMAIL / IDENTITY
                </label>
                <input
                  id="sampraan-email"
                  name="email"
                  type="email"
                  placeholder="operator@sampraan.dev"
                  autoComplete="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setFormError(null);
                  }}
                  aria-invalid={!!formError || undefined}
                  required
                />
              </div>
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="sampraan-password">
                  PASSWORD
                </label>
                <input
                  id="sampraan-password"
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setFormError(null);
                  }}
                  aria-invalid={!!formError || undefined}
                  required
                />
              </div>
              {formError && (
                <p className="sampraan-field-error" role="alert">
                  {formError}
                </p>
              )}
              <Action kind="solid" type="submit" disabled={login.isPending}>
                {login.isPending ? "VERIFYING IDENTITY…" : "Sign In →"}{" "}
              </Action>
            </form>
            <p className="auth-security-note">
              <LockKeyhole size={13} /> Protected by cryptographic identity
              verification
            </p>
            <p className="auth-legal">
              Sessions are httpOnly, server-tracked, and revocable. Login
              attempts are audited. By proceeding you acknowledge the{" "}
              <a
                href="#terms"
                onClick={e => {
                  e.preventDefault();
                  toast.info("Terms of operation", {
                    description:
                      "Permissioned access is governed by organization policy.",
                  });
                }}
              >
                terms of operation
              </a>
              .
            </p>
            <div className="auth-proof-row">
              <Status>FABRIC ONLINE</Status>
              <span>QBFT / 4 VALIDATORS</span>
              <span>SCRYPT / SERVER-SIDE</span>
            </div>
          </div>
          <button className="auth-back" onClick={onBack}>
            <ArrowDown size={14} /> BACK TO OVERVIEW
          </button>
        </section>
      </div>
    </div>
  );
}
export default function Home() {
  const [view, setView] = useState<"landing" | "auth" | "workspace">(() => {
    const preview = new URLSearchParams(window.location.search).get("view");
    return preview === "auth" || preview === "workspace" ? preview : "landing";
  });
  // Reflect the view in the URL so a reload (or a shared link) restores the
  // same surface instead of dumping the operator back on the landing page
  // mid-operation.
  const updateView = (next: "landing" | "auth" | "workspace") => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "landing") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState(null, "", url);
  };
  return view === "workspace" ? (
    <Workspace onNeedAuth={() => updateView("auth")} />
  ) : view === "auth" ? (
    <AuthGate
      onSuccess={() => updateView("workspace")}
      onBack={() => updateView("landing")}
    />
  ) : (
    <Landing enter={() => updateView("auth")} />
  );
}
