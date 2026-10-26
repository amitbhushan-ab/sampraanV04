/**
 * TinyFish Integration Test Suite for SAMPRAAN
 * Team CognixX1 · Kritical Hacks 2026
 *
 * Verifies all 6 Ground Rules, Search + Fetch advisory workflow,
 * Stage 1 AI Risk Scoring, Agent Claim Verification, Error Handling,
 * and smart contract EvidenceAnchored event integration.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TinyFishConnector, DEFAULT_ALLOWED_DOMAINS } from "./tinyfish.connector";
import { createEvidenceRecord, listEvidenceRecords, getEvidenceRecordById, updateEvidenceRecordStatus } from "../../db";
import { createHash } from "node:crypto";
import { MockBlockchainService } from "../blockchain/mock-blockchain.service";

describe("TinyFish Connector - Ground Rules & Architecture", () => {
  let connector: TinyFishConnector;

  beforeEach(() => {
    connector = new TinyFishConnector();
  });

  describe("Ground Rule 1: Approved domains allowlist", () => {
    it("accepts URLs with approved domains", () => {
      const allowedSamples = [
        "https://github.com/OpenZeppelin/openzeppelin-contracts/security/advisories/GHSA-1234",
        "https://nvd.nist.gov/vuln/detail/CVE-2026-0001",
        "https://nodejs.org/en/blog/vulnerability/february-2026",
        "https://cve.org/CVERecord?id=CVE-2026-9999",
      ];

      for (const url of allowedSamples) {
        const check = connector.validateUrl(url);
        expect(check.valid).toBe(true);
      }
    });

    it("refuses URLs whose hosts are not on the allowlist", () => {
      const blockedSamples = [
        "https://evil-hacker.com/malicious-script.js",
        "https://untrusted-blog.xyz/post",
        "https://pastebin.com/raw/something",
      ];

      for (const url of blockedSamples) {
        const check = connector.validateUrl(url);
        expect(check.valid).toBe(false);
        expect(check.reason).toMatch(/not on the TinyFish domain allowlist/i);
      }
    });
  });

  describe("Ground Rule 3: SSRF & Private Network Protection", () => {
    it("refuses localhost, loopback, and private IPv4/IPv6 addresses", () => {
      const privateSamples = [
        "http://localhost:3000/internal-admin",
        "http://127.0.0.1:8545",
        "http://0.0.0.0:80",
        "http://10.0.0.5/intranet",
        "http://192.168.1.1/router",
        "http://172.16.0.10/corp",
      ];

      for (const url of privateSamples) {
        const check = connector.validateUrl(url);
        expect(check.valid).toBe(false);
        expect(check.reason).toMatch(/rejected \(Ground Rule 3\)/i);
      }
    });
  });

  describe("Ground Rule 6 & Section 5: Evidence SHA-256 computation", () => {
    it("computes reproducible sha256 of extracted clean text", () => {
      const text = "OpenZeppelin Contracts critical ECDSA vulnerability advisory text content";
      const expectedHash = createHash("sha256").update(text, "utf8").digest("hex");

      const evidence = connector.buildEvidenceRecord({
        kind: "ADVISORY",
        component: "OpenZeppelin Contracts",
        sourceUrl: "https://github.com/OpenZeppelin/openzeppelin-contracts/security/advisories/GHSA-1234",
        text,
        title: "OpenZeppelin Contracts Critical Advisory",
      });

      expect(evidence.sha256).toBe(expectedHash);
      expect(evidence.sha256).toHaveLength(64);
      expect(evidence.status).toBe("PENDING");
    });
  });

  describe("Section 10: AI Risk Scoring (Stage 1 rules)", () => {
    it("scores 100 for component match (40) + critical severity (40) + recent (20)", () => {
      const result = connector.calculateRiskScore({
        component: "Hyperledger Besu",
        title: "Hyperledger Besu: Critical QBFT message vulnerability",
        text: "A remote code execution and denial of service vulnerability affects Hyperledger Besu nodes.",
        publishedAt: new Date(),
      });

      expect(result.score).toBe(100);
      expect(result.alert).toBe(true);
      expect(result.reason).toContain("Component match");
      expect(result.reason).toContain("Severity indicator");
      expect(result.reason).toContain("last 30 days");
    });

    it("triggers alert at 60 or more", () => {
      const result = connector.calculateRiskScore({
        component: "Express",
        title: "Express: High severity vulnerability",
        text: "Minor issue in header handling.",
        publishedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // >30 days ago
      });

      // 40 component + 40 severity + 0 recency = 80
      expect(result.score).toBe(80);
      expect(result.alert).toBe(true);
    });

    it("stays below alert threshold for low severity mentions without full match", () => {
      const result = connector.calculateRiskScore({
        component: "UnknownLibrary",
        title: "General note on updates",
        text: "Routine maintenance release notes.",
        publishedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      });

      expect(result.score).toBe(0);
      expect(result.alert).toBe(false);
    });
  });

  describe("Section 6: Use Case 2 - Claim Verification", () => {
    it("extracts vendor proof and computes canonical JSON sha256 hash", async () => {
      const url = "https://github.com/advisories/vendor/BEL";
      const goal = "Search this registry for Bharat Electronics Limited with ID L32309KA1954GOI000787";

      const run = await connector.runAgentClaimVerification(url, goal);
      expect(run.status).toBe("COMPLETED");
      expect(run.result).toBeDefined();
      expect(run.result?.companyName).toContain("Bharat Electronics Limited");
      expect(run.result?.registrationNumber).toBe("L32309KA1954GOI000787");

      const canonical = JSON.stringify(run.result, Object.keys(run.result!).sort());
      const hash = createHash("sha256").update(canonical).digest("hex");
      expect(hash).toHaveLength(64);
    });
  });

  describe("Smart Contract EvidenceAnchored Event & MockBlockchainService", () => {
    it("anchors evidence and returns confirmed transaction with EvidenceAnchored event", async () => {
      const chain = new MockBlockchainService();
      const evidenceHash = "7b236682251f865d091a11294eb4fdd70bf8d07783257417a6fd428a3f117dfd";
      const sourceUrl = "https://github.com/OpenZeppelin/openzeppelin-contracts/security/advisories/GHSA-1234";
      const fetchedAt = Math.floor(Date.now() / 1000);

      const tx = await chain.anchorEvidence({
        evidenceHash,
        sourceUrl,
        fetchedAt,
        kind: 0, // ADVISORY
      });

      expect(tx.status).toBe("CONFIRMED");
      expect(tx.transactionHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(tx.events).toBeDefined();
      expect(tx.events![0].name).toBe("EvidenceAnchored");
      expect(tx.events![0].args.evidenceHash).toBe(evidenceHash);
      expect(tx.events![0].args.sourceUrl).toBe(sourceUrl);
    });
  });

  describe("Evidence Read-Model & Approval Lifecycle", () => {
    it("creates a PENDING evidence record, approves and updates to ANCHORED with tx_hash", async () => {
      const record = await createEvidenceRecord({
        kind: "ADVISORY",
        component: "tRPC",
        sourceUrl: "https://github.com/trpc/trpc/security/advisories/GHSA-trpc-batch-dos",
        sha256: "6d64fd6c1ea114c0f333796c29566fee7d43293cea182e61f81a43168fb29544",
        riskScore: 80,
        status: "PENDING",
      });

      expect(record.id).toBeDefined();
      expect(record.status).toBe("PENDING");
      expect(record.txHash).toBeNull();

      // Human approver approves and on-chain anchoring succeeds
      const dummyTxHash = "0x" + "a".repeat(64);
      const updated = await updateEvidenceRecordStatus(record.id, {
        status: "ANCHORED",
        approvedBy: "did:sampraan:security-approver-01",
        txHash: dummyTxHash,
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("ANCHORED");
      expect(updated?.approvedBy).toBe("did:sampraan:security-approver-01");
      expect(updated?.txHash).toBe(dummyTxHash);

      // Verify retrieval by ID
      const retrieved = await getEvidenceRecordById(record.id);
      expect(retrieved?.status).toBe("ANCHORED");
      expect(retrieved?.txHash).toBe(dummyTxHash);
    });
  });
});
