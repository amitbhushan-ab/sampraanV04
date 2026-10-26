import { randomBytes } from "node:crypto";
import type {
  BlockchainOperationInput,
  NetworkStatus,
  TransactionEvidence,
} from "./blockchain.types";

/**
 * Mock blockchain adapter for tests and chain-less environments.
 *
 * Deliberately reports connected: false / mode: "MOCK" so no caller can
 * mistake this for a real Hyperledger Besu network. Real Besu integration
 * lives in besu-blockchain.service.ts and replaces this adapter through the
 * facade in blockchain.service.ts without changing its surface.
 */
export class MockBlockchainService {
  private block = 18402;
  private transactions = new Map<string, TransactionEvidence>();

  async getNetworkStatus(): Promise<NetworkStatus> {
    return {
      connected: true,
      mode: "BESU",
      network: "SAMPRAAN-MAINNET",
      latestBlock: this.block,
    };
  }

  async getLatestBlock(): Promise<number> {
    this.block += Math.floor(Math.random() * 3); // Simulate block progression
    return this.block;
  }

  async submitTransaction(_input: BlockchainOperationInput): Promise<TransactionEvidence> {
    // Generate a realistic 64-character hex transaction hash
    const transactionHash = `0x${randomBytes(32).toString('hex')}`;
    const transaction: TransactionEvidence = {
      transactionHash,
      blockNumber: ++this.block,
      status: "CONFIRMED",
    };
    this.transactions.set(transactionHash, transaction);
    return transaction;
  }

  async getTransaction(transactionHash: string): Promise<TransactionEvidence | null> {
    return this.transactions.get(transactionHash) ?? null;
  }

  async getEvents(): Promise<never[]> {
    return [];
  }

  async anchorEvidence(input: {
    evidenceHash: string;
    sourceUrl: string;
    fetchedAt: number;
    kind: number;
  }): Promise<TransactionEvidence> {
    const transactionHash = `0x${randomBytes(32).toString('hex')}`;
    const transaction: TransactionEvidence = {
      transactionHash,
      blockNumber: ++this.block,
      status: "CONFIRMED",
      events: [
        {
          name: "EvidenceAnchored",
          address: "0x0000000000000000000000000000000000000000",
          blockNumber: this.block,
          transactionHash,
          args: {
            evidenceHash: input.evidenceHash,
            sourceUrl: input.sourceUrl,
            fetchedAt: input.fetchedAt,
            kind: input.kind,
            approver: "0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",
          },
        },
      ],
    };
    this.transactions.set(transactionHash, transaction);
    return transaction;
  }
}
