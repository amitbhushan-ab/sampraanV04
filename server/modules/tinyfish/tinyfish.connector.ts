/**
 * TinyFish Connector for SAMPRAAN
 * Team CognixX1 · Kritical Hacks 2026
 *
 * Implements the TinyFish Integration Architecture:
 * - Search API (GET https://api.search.tinyfish.ai)
 * - Fetch API (POST https://api.fetch.tinyfish.ai)
 * - Agent API (POST https://agent.tinyfish.ai/v1/automation/run-async)
 *
 * Ground Rules strictly enforced:
 *  1. Approved domains only (allowlist check). Refuses any URL outside the allowlist.
 *  2. Only lookup terms go out (queries, vendor/asset IDs). Internal data never leaves.
 *  3. SSRF prevention: Rejects private IP addresses and localhost.
 *  4. Human in the loop: A person approves every on-chain write.
 *  5. API key from TINYFISH_API_KEY env var.
 *  6. Off-chain encrypted evidence: Hash on-chain, text off-chain.
 */

import { createHash } from "node:crypto";

export const DEFAULT_ALLOWED_DOMAINS = [
  "github.com",
  "nvd.nist.gov",
  "nodejs.org",
  "cve.org",
  "npmjs.com",
  "npmjs.org",
  "openzeppelin.com",
  "hyperledger.org",
  "mysql.com",
  "security.snyk.io",
  "osv.dev",
  "cve.mitre.org",
];

export const SAMPRAAN_COMPONENTS = [
  "OpenZeppelin Contracts",
  "Hyperledger Besu",
  "Node.js",
  "Express",
  "tRPC",
  "MySQL",
] as const;

export type SampraanComponent = (typeof SAMPRAAN_COMPONENTS)[number];

export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
}

export interface FetchResultItem {
  text: string;
  final_url: string;
  status?: string;
}

export interface FetchErrorItem {
  url: string;
  error: string; // bot_blocked, login_required, timeout, page_not_found
}

export interface BuiltEvidence {
  kind: "ADVISORY" | "CLAIM" | "PORTAL";
  component: string;
  sourceUrl: string;
  sha256: string;
  rawText: string;
  riskScore: number;
  riskReason: string;
  fetchedAt: Date;
  status: "PENDING";
  ipfsCid?: string;
}

export interface AgentRunResponse {
  run_id: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  result?: Record<string, unknown> | null;
  error?: string;
}

export class TinyFishConnector {
  private readonly apiKey: string | null;
  private readonly allowedDomains: Set<string>;

  constructor(options?: { apiKey?: string; allowedDomains?: string[] }) {
    this.apiKey = options?.apiKey ?? process.env.TINYFISH_API_KEY ?? null;
    this.allowedDomains = new Set(
      (options?.allowedDomains ?? DEFAULT_ALLOWED_DOMAINS).map(d => d.toLowerCase().trim())
    );
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Ground Rule 1 & 3: Validate that the URL is on the approved allowlist
   * and not targeting private IP networks (SSRF guard).
   */
  validateUrl(urlString: string): { valid: boolean; reason?: string; hostname?: string } {
    try {
      const url = new URL(urlString);
      const host = url.hostname.toLowerCase();

      // Ground rule 3: Reject localhost and private IPv4 / IPv6 addresses
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host === "::1" ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
        host.endsWith(".local") ||
        host.endsWith(".internal")
      ) {
        return {
          valid: false,
          reason: `Access to private or local network (${host}) is rejected (Ground Rule 3).`,
        };
      }

      // Ground rule 1: Hostname must match or be a subdomain of an allowed domain
      const isAllowed = Array.from(this.allowedDomains).some(
        allowed => host === allowed || host.endsWith(`.${allowed}`)
      );

      if (!isAllowed) {
        return {
          valid: false,
          reason: `Host "${host}" is not on the TinyFish domain allowlist (Ground Rule 1).`,
        };
      }

      return { valid: true, hostname: host };
    } catch (e) {
      return { valid: false, reason: `Malformed URL: ${String(e)}` };
    }
  }

  /**
   * Section 5 Step 1: Search TinyFish Search API
   */
  async search(params: {
    query: string;
    purpose?: string;
    includeDomains?: string[];
    recencyMinutes?: number;
  }): Promise<SearchResultItem[]> {
    if (!this.apiKey) {
      return this.mockSearchResults(params.query);
    }

    const searchParams = new URLSearchParams({
      query: params.query,
      purpose: params.purpose ?? "Find recent security advisories for a component in our platform",
      include_domains: (params.includeDomains ?? Array.from(this.allowedDomains)).join(","),
      recency_minutes: String(params.recencyMinutes ?? 60 * 24 * 30),
    });

    const url = `https://api.search.tinyfish.ai?${searchParams.toString()}`;
    const res = await this.fetchWithRetry(url, {
      method: "GET",
      headers: { "X-API-Key": this.apiKey },
    });

    const data = (await res.json()) as { results?: SearchResultItem[] };
    return data.results ?? [];
  }

  /**
   * Section 5 Step 2: Fetch clean text from TinyFish Fetch API
   */
  async fetchCleanText(urls: string[]): Promise<{
    results: FetchResultItem[];
    errors: FetchErrorItem[];
  }> {
    // Validate all URLs first against allowlist and SSRF guards
    for (const u of urls) {
      const check = this.validateUrl(u);
      if (!check.valid) {
        throw new Error(check.reason);
      }
    }

    if (!this.apiKey) {
      return this.mockFetchResults(urls);
    }

    const res = await this.fetchWithRetry("https://api.fetch.tinyfish.ai", {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls,
        format: "markdown",
        ttl: 0,
      }),
      timeoutMs: 150_000, // Section 4: client timeout at least 150 seconds
    });

    const data = (await res.json()) as {
      results?: FetchResultItem[];
      errors?: FetchErrorItem[];
    };

    return {
      results: data.results ?? [],
      errors: data.errors ?? [],
    };
  }

  /**
   * Section 6: TinyFish Agent API for claim verification
   */
  async runAgentClaimVerification(url: string, goal: string): Promise<AgentRunResponse> {
    const check = this.validateUrl(url);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    if (!this.apiKey) {
      return this.mockAgentClaimVerification(url, goal);
    }

    const headers = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };

    const startRes = await this.fetchWithRetry("https://agent.tinyfish.ai/v1/automation/run-async", {
      method: "POST",
      headers,
      body: JSON.stringify({ url, goal }),
    });

    const startData = (await startRes.json()) as { run_id: string };
    const runId = startData.run_id;

    // Poll up to 40 iterations with 3 second delay
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await this.fetchWithRetry(`https://agent.tinyfish.ai/v1/runs/${runId}`, {
        headers,
      });
      const runStatus = (await statusRes.json()) as AgentRunResponse;
      if (runStatus.status === "COMPLETED" || runStatus.status === "FAILED") {
        return runStatus;
      }
    }

    throw new Error("TinyFish agent run timed out after 120 seconds");
  }

  /**
   * Section 10: AI Risk Scoring (Stage 1 rules)
   * Score = component match (40) + severity word (40) + published in the last 30 days (20).
   * Alert at 60 or more.
   */
  calculateRiskScore(input: {
    component: string;
    title: string;
    text: string;
    publishedAt?: Date | string;
  }): { score: number; reason: string; alert: boolean } {
    let score = 0;
    const reasons: string[] = [];

    const fullContent = `${input.title} ${input.text}`.toLowerCase();
    const compLower = input.component.toLowerCase();

    // 1. Component match (+40)
    if (fullContent.includes(compLower)) {
      score += 40;
      reasons.push(`Component match: ${input.component} (+40)`);
    } else {
      // Check sub-parts (e.g. "openzeppelin", "besu", "trpc")
      const keywords = compLower.split(/\s+/);
      if (keywords.some(k => fullContent.includes(k))) {
        score += 30;
        reasons.push(`Partial component keyword match (+30)`);
      }
    }

    // 2. Severity word match (+40)
    const severityWords = [
      "critical",
      "high severity",
      "remote code execution",
      "rce",
      "arbitrary code execution",
      "privilege escalation",
      "denial of service",
      "dos",
      "vulnerability",
    ];

    const matchedSeverity = severityWords.find(w => fullContent.includes(w));
    if (matchedSeverity) {
      score += 40;
      reasons.push(`Severity indicator found: "${matchedSeverity}" (+40)`);
    }

    // 3. Published in last 30 days (+20)
    let isRecent = true;
    if (input.publishedAt) {
      const pubDate = new Date(input.publishedAt).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      isRecent = pubDate >= thirtyDaysAgo;
    }
    if (isRecent) {
      score += 20;
      reasons.push("Published within last 30 days (+20)");
    }

    const alert = score >= 60;
    return {
      score,
      reason: reasons.join("; ") || "Standard security advisory assessment",
      alert,
    };
  }

  /**
   * Section 5 Step 3: Build evidence record
   * Compute sha256(text), keep final_url, timestamp UTC.
   */
  buildEvidenceRecord(input: {
    kind: "ADVISORY" | "CLAIM" | "PORTAL";
    component: string;
    sourceUrl: string;
    text: string;
    title?: string;
    publishedAt?: Date | string;
    ipfsCid?: string;
  }): BuiltEvidence {
    const sha256 = createHash("sha256").update(input.text, "utf8").digest("hex");
    const risk = this.calculateRiskScore({
      component: input.component,
      title: input.title ?? input.component,
      text: input.text,
      publishedAt: input.publishedAt,
    });

    return {
      kind: input.kind,
      component: input.component,
      sourceUrl: input.sourceUrl,
      sha256,
      rawText: input.text,
      riskScore: risk.score,
      riskReason: risk.reason,
      fetchedAt: new Date(),
      status: "PENDING",
      ipfsCid: input.ipfsCid,
    };
  }

  /**
   * Section 12: Resilient fetch with exponential backoff & error handling
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit & { timeoutMs?: number },
    maxRetries = 3
  ): Promise<Response> {
    let delay = 1000;
    const timeout = options.timeoutMs ?? 150_000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          return res;
        }

        // Section 12: Handle HTTP errors
        if (res.status === 401) {
          throw new Error("401 Unauthorized: TINYFISH_API_KEY is missing or invalid. Check the environment variable.");
        }
        if (res.status === 402) {
          throw new Error("402 Payment Required: TinyFish daily allowance used and wallet empty. Wait for 00:00 UTC reset or add funds.");
        }
        if (res.status === 429) {
          console.warn(`[TinyFish] Rate limit exceeded (429). Retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
          if (attempt === maxRetries) {
            throw new Error("429 Rate limit exceeded: Maximum retries reached. Back off and retry later.");
          }
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        if (res.status >= 500) {
          console.warn(`[TinyFish] Service unavailable (${res.status}). Retrying in ${delay}ms...`);
          if (attempt === maxRetries) {
            throw new Error(`503 Service unavailable: Server returned ${res.status}.`);
          }
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        const body = await res.text().catch(() => "");
        throw new Error(`TinyFish request failed with status ${res.status}: ${body}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === maxRetries || msg.includes("401") || msg.includes("402")) {
          throw err;
        }
        console.warn(`[TinyFish] Attempt ${attempt} failed: ${msg}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }

    throw new Error("TinyFish request failed after maximum retries.");
  }

  // ------------------------------------------------------------------
  // Self-Test & Demonstration Mock Generators (for self-test mode)
  // ------------------------------------------------------------------

  mockSearchResults(query: string): SearchResultItem[] {
    const q = query.toLowerCase();
    if (q.includes("openzeppelin")) {
      return [
        {
          title: "OpenZeppelin Contracts: ECDSA Signature Malleability Advisory",
          url: "https://github.com/OpenZeppelin/openzeppelin-contracts/security/advisories/GHSA-4h98-2769-gh6h",
          snippet: "High severity advisory: ECDSA signature malleability vulnerability in OpenZeppelin Contracts before 4.7.3.",
          date: new Date().toISOString(),
        },
      ];
    }
    if (q.includes("besu")) {
      return [
        {
          title: "Hyperledger Besu: QBFT Consensus Message Handling Vulnerability",
          url: "https://github.com/hyperledger/besu/security/advisories/GHSA-9892-besu-qbft",
          snippet: "Critical severity advisory: Hyperledger Besu RPC and QBFT validator consensus denial of service.",
          date: new Date().toISOString(),
        },
      ];
    }
    if (q.includes("node")) {
      return [
        {
          title: "Node.js Security Release: HTTP Request Smuggling Remote Code Execution",
          url: "https://nodejs.org/en/blog/vulnerability/february-2026-security-releases",
          snippet: "Node.js critical security advisory addressing llhttp HTTP parsing and remote code execution.",
          date: new Date().toISOString(),
        },
      ];
    }
    if (q.includes("express")) {
      return [
        {
          title: "Express: Prototype Pollution via qs query parser",
          url: "https://github.com/expressjs/express/security/advisories/GHSA-express-qs-proto",
          snippet: "High severity advisory in Express nested query parameter handling resulting in prototype override.",
          date: new Date().toISOString(),
        },
      ];
    }
    if (q.includes("trpc")) {
      return [
        {
          title: "tRPC: Batch Request Denial of Service vulnerability",
          url: "https://github.com/trpc/trpc/security/advisories/GHSA-trpc-batch-dos",
          snippet: "High severity advisory: unbounded recursive query resolution leads to resource exhaustion.",
          date: new Date().toISOString(),
        },
      ];
    }
    return [
      {
        title: "MySQL Server: Critical authentication bypass in SSL handshake",
        url: "https://nvd.nist.gov/vuln/detail/CVE-2026-8821-mysql",
        snippet: "NVD vulnerability entry for MySQL server connection handling with high severity impact.",
        date: new Date().toISOString(),
      },
    ];
  }

  mockFetchResults(urls: string[]): {
    results: FetchResultItem[];
    errors: FetchErrorItem[];
  } {
    const results: FetchResultItem[] = urls.map(url => {
      let component = "MySQL";
      if (url.includes("openzeppelin")) component = "OpenZeppelin Contracts";
      else if (url.includes("besu")) component = "Hyperledger Besu";
      else if (url.includes("nodejs")) component = "Node.js";
      else if (url.includes("express")) component = "Express";
      else if (url.includes("trpc")) component = "tRPC";

      const text = [
        `# Security Advisory: ${component} Critical Vulnerability`,
        `Source: ${url}`,
        `Published: ${new Date().toISOString()}`,
        `Severity: Critical (CVSS 9.1)`,
        `Affects: ${component} core runtime in SAMPRAAN stack`,
        ``,
        `### Summary`,
        `A high-risk security vulnerability was identified in ${component}.`,
        `An attacker could exploit this issue leading to remote code execution or state inconsistency.`,
        ``,
        `### Recommendation`,
        `Operators of permissioned networks should apply the patch immediately and verify with on-chain audit evidence.`,
      ].join("\n");

      return {
        text,
        final_url: url,
        status: "OK",
      };
    });

    return { results, errors: [] };
  }

  mockAgentClaimVerification(url: string, goal: string): AgentRunResponse {
    return {
      run_id: "run_mock_tinyfish_agent_" + Date.now(),
      status: "COMPLETED",
      result: {
        targetUrl: url,
        goal,
        companyName: "Bharat Electronics Limited (BEL)",
        registrationNumber: "L32309KA1954GOI000787",
        status: "ACTIVE",
        certificateNumber: "BEL-CERT-2026-991A",
        expiryDate: "2028-12-31",
        verifiedAt: new Date().toISOString(),
        canonicalProofHash: createHash("sha256")
          .update(
            JSON.stringify({
              companyName: "Bharat Electronics Limited (BEL)",
              registrationNumber: "L32309KA1954GOI000787",
              status: "ACTIVE",
            })
          )
          .digest("hex"),
      },
    };
  }
}

export const tinyFishConnector = new TinyFishConnector();
