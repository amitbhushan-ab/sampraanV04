import { randomUUID, randomBytes } from "node:crypto";
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
}
