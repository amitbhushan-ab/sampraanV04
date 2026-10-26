import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ShieldCheck,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Bot,
  RefreshCw,
  Download,
  FileText,
  Globe,
  X,
} from "lucide-react";

interface EvidenceItem {
  id: number;
  kind: "ADVISORY" | "CLAIM" | "PORTAL";
  component: string;
  sourceUrl: string;
  fetchedAt: Date | string;
  sha256: string;
  ipfsCid: string | null;
  riskScore: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ANCHORED";
  approvedBy: string | null;
  txHash: string | null;
  rawText: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function EvidencePage({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
}) {
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<
    "ALL" | "PENDING" | "ANCHORED" | "REJECTED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(
    null
  );
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Form state for Agent Claim verification
  const [claimUrl, setClaimUrl] = useState(
    "https://github.com/advisories/vendor/BEL"
  );
  const [claimCompany, setClaimCompany] = useState(
    "Bharat Electronics Limited (BEL)"
  );
  const [claimRegId, setClaimRegId] = useState("L32309KA1954GOI000787");

  // Queries
  const { data: evidenceList = [], isLoading } = trpc.evidence.list.useQuery();
  const { data: statusInfo } = trpc.evidence.status.useQuery();

  // Mutations
  const runWatchMutation = trpc.evidence.runWatch.useMutation({
    onSuccess: data => {
      toast.success("TinyFish Advisory Watch Complete", {
        description: `Scanned ${data.scanned} components · Produced ${data.created} new evidence records.`,
      });
      void utils.evidence.invalidate();
      void utils.alerts.invalidate();
      void utils.audit.invalidate();
    },
    onError: err => {
      toast.error("Advisory watch scan failed", { description: err.message });
    },
  });

  const approveMutation = trpc.evidence.approveAndAnchor.useMutation({
    onSuccess: data => {
      const tx = data.transaction?.transactionHash
        ? `${data.transaction.transactionHash.slice(0, 18)}…`
        : "Confirmed on-chain";
      toast.success("Evidence approved and anchored on-chain", {
        description: `Emitted EvidenceAnchored event with Besu tx: ${tx}`,
      });
      void utils.evidence.invalidate();
      void utils.audit.invalidate();
      void utils.blockchain.invalidate();
    },
    onError: err => {
      toast.error("Approval & Anchoring failed", { description: err.message });
    },
  });

  const rejectMutation = trpc.evidence.reject.useMutation({
    onSuccess: () => {
      toast.info("Evidence record rejected", {
        description: "Marked as REJECTED in the audit queue.",
      });
      void utils.evidence.invalidate();
      void utils.audit.invalidate();
    },
    onError: err => {
      toast.error("Rejection failed", { description: err.message });
    },
  });

  const verifyClaimMutation = trpc.evidence.verifyClaim.useMutation({
    onSuccess: () => {
      toast.success("Agent Claim Verification Completed", {
        description:
          "Extracted vendor proof and added PENDING evidence record to the queue.",
      });
      setShowClaimModal(false);
      void utils.evidence.invalidate();
      void utils.audit.invalidate();
    },
    onError: err => {
      toast.error("Agent verification failed", { description: err.message });
    },
  });

  // Filtered evidence items
  const filteredItems = useMemo(() => {
    return evidenceList.filter(item => {
      if (activeTab !== "ALL" && item.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.component.toLowerCase().includes(q) ||
          item.sourceUrl.toLowerCase().includes(q) ||
          item.sha256.toLowerCase().includes(q) ||
          item.kind.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [evidenceList, activeTab, searchQuery]);

  const counts = useMemo(() => {
    const pending = evidenceList.filter(e => e.status === "PENDING").length;
    const anchored = evidenceList.filter(e => e.status === "ANCHORED").length;
    const rejected = evidenceList.filter(e => e.status === "REJECTED").length;
    return { all: evidenceList.length, pending, anchored, rejected };
  }, [evidenceList]);

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.info(`Copied ${label} to clipboard`);
  };

  const exportEvidenceJson = () => {
    const jsonStr = JSON.stringify(evidenceList, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sampraan-evidence-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported evidence.json");
  };

  return (
    <div className="special-page">
      {/* Heading */}
      <div className="special-heading">
        <div>
          <div className="eyebrow">
            TRUST FABRIC / TINYFISH CONNECTOR & ANCHORING
          </div>
          <h1>External Evidence & Anchoring</h1>
          <p>
            Outside intelligence fetched via TinyFish Search/Fetch/Agent, scored
            deterministically, and anchored on-chain with human approval.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="action outline"
            onClick={exportEvidenceJson}
            disabled={evidenceList.length === 0}
            title="Download evidence.json array"
          >
            <Download size={14} /> Export JSON
          </button>
          <button
            type="button"
            className="action outline"
            onClick={() => setShowClaimModal(true)}
            title="Run TinyFish Agent claim lookup (Use Case 2)"
          >
            <Bot size={14} /> Verify Claim (Agent)
          </button>
          <button
            type="button"
            className="action solid"
            onClick={() => runWatchMutation.mutate({})}
            disabled={runWatchMutation.isPending}
            title="Trigger TinyFish Security Advisory Watch across stack components"
          >
            <RefreshCw
              size={14}
              className={runWatchMutation.isPending ? "animate-spin" : ""}
            />
            {runWatchMutation.isPending
              ? "SCANNING SOURCES…"
              : "RUN ADVISORY WATCH"}
          </button>
        </div>
      </div>

      {/* Ground Rules Callout Banner */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} style={{ color: "var(--ok)" }} />
          <b style={{ fontSize: 13, letterSpacing: "0.03em" }}>
            TINYFISH ZERO-TRUST INTEGRATION ENFORCEMENT
          </b>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              background: statusInfo?.isTinyFishConfigured
                ? "color-mix(in srgb, var(--ok) 15%, transparent)"
                : "color-mix(in srgb, var(--warn) 15%, transparent)",
              color: statusInfo?.isTinyFishConfigured
                ? "var(--ok)"
                : "var(--warn)",
              fontWeight: 600,
            }}
          >
            {statusInfo?.isTinyFishConfigured
              ? "LIVE API CONFIGURED"
              : "SELF-TEST MOCK MODE ACTIVE"}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            fontSize: 12,
            color: "var(--subtle)",
          }}
        >
          <div>
            <strong style={{ color: "var(--text)" }}>
              Rule 1: Approved Domains Only
            </strong>
            <p style={{ margin: "2px 0 0" }}>
              Connector enforces strict allowlist (GitHub, NVD NIST, Node.js,
              CVE).
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--text)" }}>
              Rule 2: Lookup Terms Only
            </strong>
            <p style={{ margin: "2px 0 0" }}>
              Only public query names leave SAMPRAAN; secrets and keys never
              leave.
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--text)" }}>
              Rule 3: Private Networks Blocked
            </strong>
            <p style={{ margin: "2px 0 0" }}>
              SSRF guard blocks localhost and RFC 1918 private intranet IP
              ranges.
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--text)" }}>
              Rule 4: Human-in-the-Loop
            </strong>
            <p style={{ margin: "2px 0 0" }}>
              A person approves every on-chain write. AI scores never
              self-anchor.
            </p>
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="intel-top" style={{ marginBottom: 20 }}>
        <div className="mini-metric">
          <span>PENDING REVIEW</span>
          <strong className={counts.pending > 0 ? "amber" : "mint"}>
            {counts.pending}
          </strong>
          <small>
            <i className={counts.pending > 0 ? "amber" : "mint"} />
            HUMAN APPROVAL QUEUE
          </small>
        </div>
        <div className="mini-metric">
          <span>ANCHORED ON-CHAIN</span>
          <strong className="mint">{counts.anchored}</strong>
          <small>
            <i className="mint" />
            BESU QBFT RECEIPT RECORDED
          </small>
        </div>
        <div className="mini-metric">
          <span>STACK COMPONENTS</span>
          <strong className="teal">6</strong>
          <small>
            <i className="teal" />
            OPENZEPPELIN, BESU, NODE, TRPC, EXPRESS, MYSQL
          </small>
        </div>
        <div className="mini-metric">
          <span>EVIDENCE REJECTED</span>
          <strong className="muted">{counts.rejected}</strong>
          <small>
            <i className="muted" />
            DISMISSED ADVISORIES
          </small>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="filter-row" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={activeTab === "ALL" ? "active" : ""}
            onClick={() => setActiveTab("ALL")}
          >
            All Evidence ({counts.all})
          </button>
          <button
            type="button"
            className={activeTab === "PENDING" ? "active" : ""}
            onClick={() => setActiveTab("PENDING")}
          >
            Pending Review ({counts.pending})
          </button>
          <button
            type="button"
            className={activeTab === "ANCHORED" ? "active" : ""}
            onClick={() => setActiveTab("ANCHORED")}
          >
            Anchored ({counts.anchored})
          </button>
          <button
            type="button"
            className={activeTab === "REJECTED" ? "active" : ""}
            onClick={() => setActiveTab("REJECTED")}
          >
            Rejected ({counts.rejected})
          </button>
        </div>

        <label
          className="table-search"
          htmlFor="evidence-search"
          style={{ marginLeft: "auto" }}
        >
          <Search size={14} aria-hidden="true" />
          <input
            id="evidence-search"
            type="search"
            placeholder="Search component, URL, or hash…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </label>
      </div>

      {/* Main Evidence Table */}
      <div className="audit-table-panel">
        <div
          className="audit-head"
          style={{
            gridTemplateColumns: "110px 170px 1fr 100px 110px 130px 180px",
          }}
        >
          <span>KIND / ID</span>
          <span>COMPONENT</span>
          <span>SOURCE URL & EVIDENCE HASH</span>
          <span>RISK SCORE</span>
          <span>STATUS</span>
          <span>ON-CHAIN TX</span>
          <span>ACTION</span>
        </div>

        {filteredItems.map(item => {
          const isPending = item.status === "PENDING";
          const isAnchored = item.status === "ANCHORED";
          const isAlert = item.riskScore >= 60;

          return (
            <div
              key={item.id}
              className="audit-row"
              style={{
                gridTemplateColumns: "110px 170px 1fr 100px 110px 130px 180px",
                alignItems: "center",
              }}
            >
              {/* Kind / ID */}
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 3,
                    background:
                      item.kind === "ADVISORY"
                        ? "rgba(59, 130, 246, 0.15)"
                        : item.kind === "CLAIM"
                          ? "rgba(168, 85, 247, 0.15)"
                          : "rgba(107, 114, 128, 0.15)",
                    color:
                      item.kind === "ADVISORY"
                        ? "#60a5fa"
                        : item.kind === "CLAIM"
                          ? "#c084fc"
                          : "#9ca3af",
                  }}
                >
                  {item.kind}
                </span>
                <div
                  style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}
                >
                  #{item.id}
                </div>
              </div>

              {/* Component */}
              <div>
                <b style={{ fontSize: 13 }}>{item.component}</b>
                <div style={{ fontSize: 11, color: "var(--subtle)" }}>
                  {new Date(item.fetchedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* Source URL & Hash */}
              <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--info)",
                    textDecoration: "none",
                  }}
                  title={item.sourceUrl}
                >
                  <Globe size={12} />
                  <span className="truncate">{item.sourceUrl}</span>
                  <ExternalLink size={10} />
                </a>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 10, color: "var(--subtle)" }}>
                    SHA-256:
                  </span>
                  <code
                    style={{
                      fontSize: 11,
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.05)",
                      padding: "1px 5px",
                      borderRadius: 3,
                    }}
                    onClick={() =>
                      copyToClipboard(item.sha256, "evidence hash")
                    }
                    title="Click to copy full SHA-256 hash"
                  >
                    {item.sha256.slice(0, 16)}…{item.sha256.slice(-6)}
                  </code>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onClick={() => setSelectedEvidence(item)}
                    title="Inspect raw extracted evidence text"
                  >
                    <FileText size={12} style={{ color: "var(--subtle)" }} />
                  </button>
                </div>
              </div>

              {/* Risk Score */}
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: isAlert
                      ? "rgba(239, 68, 68, 0.15)"
                      : item.riskScore >= 40
                        ? "rgba(245, 158, 11, 0.15)"
                        : "rgba(16, 185, 129, 0.15)",
                    color: isAlert
                      ? "#f87171"
                      : item.riskScore >= 40
                        ? "#fbbf24"
                        : "#34d399",
                  }}
                  title={`Stage 1 Rule Score: ${item.riskScore}/100`}
                >
                  {item.riskScore}/100
                </span>
                {isAlert && (
                  <div
                    style={{
                      fontSize: 9,
                      color: "#f87171",
                      fontWeight: 600,
                      marginTop: 2,
                    }}
                  >
                    ALERT ≥60
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <span
                  className={`status ${
                    item.status === "ANCHORED"
                      ? "mint"
                      : item.status === "PENDING"
                        ? "amber"
                        : "red"
                  }`}
                >
                  <i />
                  {item.status}
                </span>
              </div>

              {/* Tx Hash */}
              <div>
                {item.txHash ? (
                  <div>
                    <code
                      style={{
                        fontSize: 11,
                        color: "var(--ok)",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        copyToClipboard(item.txHash!, "Besu transaction hash")
                      }
                      title="Confirmed on Besu QBFT chain — Click to copy"
                    >
                      {item.txHash.slice(0, 10)}…
                    </code>
                    {onNavigate && (
                      <div>
                        <button
                          type="button"
                          onClick={() => onNavigate("Audit Evidence")}
                          style={{
                            fontSize: 10,
                            color: "var(--info)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          View in Audit →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--subtle)" }}>
                    — not anchored —
                  </span>
                )}
              </div>

              {/* Actions */}
              <div>
                {isPending ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="action solid"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() => approveMutation.mutate({ id: item.id })}
                      disabled={approveMutation.isPending}
                      title="Human approver authorization — triggers on-chain anchorEvidence transaction"
                    >
                      <CheckCircle2 size={12} />
                      {approveMutation.isPending
                        ? "ANCHORING…"
                        : "Approve & Anchor"}
                    </button>
                    <button
                      type="button"
                      className="action outline"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() =>
                        rejectMutation.mutate({
                          id: item.id,
                          reason:
                            "Dismissed by security operator during manual review",
                        })
                      }
                      disabled={rejectMutation.isPending}
                      title="Reject this advisory"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                ) : isAnchored ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <CheckCircle2 size={14} style={{ color: "var(--ok)" }} />
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--ok)",
                        fontWeight: 600,
                      }}
                    >
                      Anchored On-Chain
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--subtle)" }}>
                    Dismissed
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && !isLoading && (
          <div
            className="table-empty"
            style={{ padding: "40px 20px", textAlign: "center" }}
          >
            <Globe
              size={32}
              style={{ color: "var(--subtle)", margin: "0 auto 12px" }}
            />
            <h3>No Evidence Records Found</h3>
            <p
              style={{
                maxWidth: 440,
                margin: "6px auto 16px",
                color: "var(--subtle)",
                fontSize: 13,
              }}
            >
              {activeTab !== "ALL"
                ? `No evidence items match the "${activeTab}" filter.`
                : "No external evidence has been fetched yet. Click 'RUN ADVISORY WATCH' above or execute scripts/advisory_watch.js to query outside security advisories."}
            </p>
            {activeTab === "ALL" && (
              <button
                type="button"
                className="action solid"
                onClick={() => runWatchMutation.mutate({})}
                disabled={runWatchMutation.isPending}
              >
                <RefreshCw size={14} /> Start Advisory Scan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Raw Evidence Text Modal */}
      {selectedEvidence && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedEvidence(null);
          }}
        >
          <div className="sampraan-dialog" style={{ maxWidth: 680 }}>
            <div className="sampraan-dialog-head">
              <div>
                <div className="eyebrow">
                  EVIDENCE RECORD #{selectedEvidence.id}
                </div>
                <h2>{selectedEvidence.component}</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setSelectedEvidence(null)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="evidence-block">
              <div className="decision-proof">
                <div>
                  <span>KIND</span>
                  <code>{selectedEvidence.kind}</code>
                </div>
                <div>
                  <span>SOURCE URL</span>
                  <code>{selectedEvidence.sourceUrl}</code>
                </div>
                <div>
                  <span>SHA-256 HASH</span>
                  <code style={{ wordBreak: "break-all" }}>
                    {selectedEvidence.sha256}
                  </code>
                </div>
                <div>
                  <span>RISK SCORE</span>
                  <code>
                    {selectedEvidence.riskScore}/100 (Stage 1 Rule Engine)
                  </code>
                </div>
                <div>
                  <span>STATUS</span>
                  <code>{selectedEvidence.status}</code>
                </div>
                {selectedEvidence.txHash && (
                  <div>
                    <span>BESU TX HASH</span>
                    <code style={{ wordBreak: "break-all" }}>
                      {selectedEvidence.txHash}
                    </code>
                  </div>
                )}
                {selectedEvidence.approvedBy && (
                  <div>
                    <span>APPROVED BY</span>
                    <code>{selectedEvidence.approvedBy}</code>
                  </div>
                )}
              </div>

              <h4 style={{ marginTop: 14 }}>
                OFF-CHAIN EXTRACTED TEXT (CLEAN MARKDOWN)
              </h4>
              <pre
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  maxHeight: 250,
                  overflowY: "auto",
                  border: "1px solid var(--line)",
                }}
              >
                {selectedEvidence.rawText ||
                  "No raw text recorded for this item."}
              </pre>
            </div>

            <div className="sampraan-dialog-actions" style={{ marginTop: 14 }}>
              {selectedEvidence.status === "PENDING" && (
                <button
                  type="button"
                  className="action solid"
                  onClick={() => {
                    approveMutation.mutate({ id: selectedEvidence.id });
                    setSelectedEvidence(null);
                  }}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 size={14} /> Approve & Anchor On-Chain
                </button>
              )}
              <button
                type="button"
                className="action outline"
                onClick={() => setSelectedEvidence(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Verification Modal (Use Case 2) */}
      {showClaimModal && (
        <div
          className="sampraan-dialog-overlay"
          role="dialog"
          aria-modal="true"
          onClick={e => {
            if (e.target === e.currentTarget) setShowClaimModal(false);
          }}
        >
          <div className="sampraan-dialog" style={{ maxWidth: 580 }}>
            <div className="sampraan-dialog-head">
              <div>
                <div className="eyebrow">TINYFISH AGENT API (USE CASE 2)</div>
                <h2>Verify Registry Claim</h2>
              </div>
              <button
                className="sampraan-dialog-close"
                onClick={() => setShowClaimModal(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <p
              style={{ fontSize: 13, color: "var(--subtle)", marginBottom: 16 }}
            >
              Dispatches an autonomous TinyFish agent to extract proof from a
              registry without an API, computes the canonical SHA-256 hash, and
              queues it for human approval.
            </p>

            <form
              onSubmit={e => {
                e.preventDefault();
                verifyClaimMutation.mutate({
                  url: claimUrl,
                  companyName: claimCompany,
                  registrationNumber: claimRegId,
                });
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="claim-url">
                  REGISTRY TARGET URL
                </label>
                <input
                  id="claim-url"
                  type="url"
                  value={claimUrl}
                  onChange={e => setClaimUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  required
                />
              </div>

              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="claim-company">
                  VENDOR / COMPANY NAME
                </label>
                <input
                  id="claim-company"
                  type="text"
                  value={claimCompany}
                  onChange={e => setClaimCompany(e.target.value)}
                  placeholder="Bharat Electronics Limited (BEL)"
                  required
                />
              </div>

              <div className="sampraan-field">
                <label className="sampraan-label" htmlFor="claim-reg-id">
                  REGISTRATION NUMBER
                </label>
                <input
                  id="claim-reg-id"
                  type="text"
                  value={claimRegId}
                  onChange={e => setClaimRegId(e.target.value)}
                  placeholder="L32309KA1954GOI000787"
                  required
                />
              </div>

              <div
                className="sampraan-dialog-actions"
                style={{ marginTop: 10 }}
              >
                <button
                  type="button"
                  className="action outline"
                  onClick={() => setShowClaimModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action solid"
                  disabled={verifyClaimMutation.isPending}
                >
                  <Bot size={14} />
                  {verifyClaimMutation.isPending
                    ? "AGENT RUNNING…"
                    : "Run Agent Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
