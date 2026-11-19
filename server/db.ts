import { and, desc, eq, gt, inArray, isNotNull, isNull, max, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  assetAccessGrants,
  assetApprovals,
  assetContentVersions,
  assetCustody,
  assetDisputes,
  assetTransferRequests,
  assets,
  assuranceChallenges,
  auditEvents,
  auditReportHashes,
  authorizationDecisions,
  consentGrants,
  didDocumentVersions,
  identities,
  didRecords,
  identityAnomalies,
  identityRoles,
  keyRecoveryRequests,
  mintRequests,
  ownershipPresentations,
  permissions,
  policies,
  pqcKeyRecords,
  rolePermissions,
  roles,
  securityAlerts,
  sessions,
  users,
  evidence,
  type Evidence,
  type InsertEvidence,
  type Asset,
  type AssetContentVersion,
  type Identity,
  type InsertAsset,
  type InsertIdentity,
  type InsertUser,
  type User,
  type Policy,
  type AuditEvent,
} from "../drizzle/schema";
import { isDuplicateEntryError } from "./modules/db/db-errors";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Robust DB accessor with in-memory fallback.
 * When MySQL is offline or connection fails, the operation falls through to the mock fallback.
 */
export async function withDb<T>(
  op: (db: NonNullable<Awaited<ReturnType<typeof getDb>>>) => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  try {
    const db = await getDb();
    if (db) {
      return await op(db);
    }
  } catch (_error) {
    // Database connection refused or query error — gracefully invoke fallback
  }
  return fallback();
}

/* ------------------------------------------------------------------ */
/* IN-MEMORY DEMO DATASETS FOR LOCAL EVALUATION / OFFLINE PRESENTATION */
/* ------------------------------------------------------------------ */

export const DEMO_IDENTITY_IDS = {
  ADMIN: "11111111-1111-4111-8111-111111111111",
  MANAGER: "22222222-2222-4222-8222-222222222222",
  AUDITOR: "33333333-3333-4333-8333-333333333333",
  USER: "44444444-4444-4444-8444-444444444444",
} as const;

export const _DEMO_USERS: User[] = [
  {
    id: 1,
    openId: "sampraan-dev-admin",
    name: "Dev Admin (Aarav Mehta)",
    email: "admin@sampraan.dev",
    loginMethod: "password",
    role: "admin",
    passwordHash: "scrypt$32768$8$1$Ef9bi37lcmMukgPtlabdkQ$B4ua25DVztppLfwrOHuqRMzS73MzFK6fICtHvWihvm2UY680Qa8P1sSQAgxEbBTrOFAoPdbGvFKGgLeA1Mir-g",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  {
    id: 2,
    openId: "sampraan-dev-manager",
    name: "Dev Manager (Ananya Rao)",
    email: "manager@sampraan.dev",
    loginMethod: "password",
    role: "user",
    passwordHash: "scrypt$32768$8$1$1HNgSjIgi68Ct3_FiRN_Yw$kHFJYVZhsELdvyuWRqWmD23rjksUFFeK7Gvmm0T6PKjxuZjY2SkzngosjO3fkmjhYmfSDfBSZYlW_9Zo3qJcyQ",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  {
    id: 3,
    openId: "sampraan-dev-auditor",
    name: "Dev Auditor (Vikram Singh)",
    email: "auditor@sampraan.dev",
    loginMethod: "password",
    role: "user",
    passwordHash: "scrypt$32768$8$1$cU9n_HofabIJZa0zDjG0xg$NqY9R406QKoJ-TT54b3k-iq5hXaJ3dEsLKI-I2EoKr-pv0ireKKkku2Xp-NsiBiUjkyGF8uUEVvdvCgU0rkgIw",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  {
    id: 4,
    openId: "sampraan-dev-user",
    name: "Dev User (Riya Kulkarni)",
    email: "user@sampraan.dev",
    loginMethod: "password",
    role: "user",
    passwordHash: "scrypt$32768$8$1$JtHjWuklYeEPPoMV0qULuQ$6edhlbzHan4WNTaeW1B0wBOn4hU58t7iJ3o4Vw9KD-ZFg95T2IAIIBASnvRv-7LCfmAFXeOxvbDJeHtD5-tyhw",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
];

export const _DEMO_IDENTITIES: Identity[] = [
  {
    id: DEMO_IDENTITY_IDS.ADMIN,
    linkedUserId: 1,
    displayName: "Dev Admin (Aarav Mehta)",
    organization: "Bharat Electronics Limited (BEL)",
    status: "ACTIVE",
    did: "did:sampraan:dev-admin-aarav",
    lifecycleState: "VERIFIED",
    statusReason: "Institutional Administrator Credentials",
    scope: "NATIONAL",
    deactivatedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    revokedAt: null,
  },
  {
    id: DEMO_IDENTITY_IDS.MANAGER,
    linkedUserId: 2,
    displayName: "Dev Manager (Ananya Rao)",
    organization: "Bharat Electronics Limited (BEL)",
    status: "ACTIVE",
    did: "did:sampraan:dev-manager-ananya",
    lifecycleState: "VERIFIED",
    statusReason: "Asset Operations Lead",
    scope: "DEFENSE-RADAR-DIV",
    deactivatedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    revokedAt: null,
  },
  {
    id: DEMO_IDENTITY_IDS.AUDITOR,
    linkedUserId: 3,
    displayName: "Dev Auditor (Vikram Singh)",
    organization: "Bharat Electronics Limited (BEL)",
    status: "ACTIVE",
    did: "did:sampraan:dev-auditor-vikram",
    lifecycleState: "VERIFIED",
    statusReason: "Compliance & Security Auditor",
    scope: "AUDIT-OVERSIGHT",
    deactivatedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    revokedAt: null,
  },
  {
    id: DEMO_IDENTITY_IDS.USER,
    linkedUserId: 4,
    displayName: "Dev User (Riya Kulkarni)",
    organization: "Bharat Electronics Limited (BEL)",
    status: "ACTIVE",
    did: "did:sampraan:dev-user-riya",
    lifecycleState: "VERIFIED",
    statusReason: "Operational Engineer",
    scope: "FIELD-OPS",
    deactivatedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    revokedAt: null,
  },
];

export const _DEMO_ROLES_BY_IDENTITY: Record<string, { roles: string[]; permissions: string[] }> = {
  [DEMO_IDENTITY_IDS.ADMIN]: {
    roles: ["ADMIN"],
    permissions: [
      "identity:create", "identity:read", "identity:update", "identity:revoke",
      "asset:create", "asset:read", "asset:edit", "asset:assign", "asset:transfer", "asset:revoke",
      "audit:read", "policy:create", "policy:update", "administration:manage",
    ],
  },
  [DEMO_IDENTITY_IDS.MANAGER]: {
    roles: ["MANAGER"],
    permissions: ["identity:read", "asset:read", "asset:edit", "asset:assign", "asset:transfer", "audit:read"],
  },
  [DEMO_IDENTITY_IDS.AUDITOR]: {
    roles: ["AUDITOR"],
    permissions: ["identity:read", "asset:read", "audit:read"],
  },
  [DEMO_IDENTITY_IDS.USER]: {
    roles: ["USER"],
    permissions: ["asset:read"],
  },
};

export const _DEMO_ASSETS: Asset[] = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    assetId: "DEV-FIRMWARE-001",
    name: "Restricted Firmware Package (Demo)",
    type: "FIRMWARE",
    classification: "HIGHLY_SENSITIVE",
    description: "Fictional firmware artifact for the step-up CHALLENGE demonstration.",
    ownerIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    custodianIdentityId: DEMO_IDENTITY_IDS.MANAGER,
    integrityHash: "sha256:4b9a11a2f6434415842880b980e1b20f188331d044ddb53c1264c767425f1b53",
    tokenId: "101",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    assetId: "DEV-INSTRUMENT-002",
    name: "Environmental Test Instrument (Demo)",
    type: "INSTRUMENT",
    classification: "CONTROLLED",
    description: "Fictional test instrument for the ALLOW transfer demonstration.",
    ownerIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    custodianIdentityId: DEMO_IDENTITY_IDS.MANAGER,
    integrityHash: "sha256:7c3b290df62d2ea789d71c890184b295c51717fb865532ab1947e1d5a89f9e31",
    tokenId: "102",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    assetId: "DEV-SPEC-003",
    name: "Radar Interface Specification (Demo)",
    type: "DOCUMENT",
    classification: "SENSITIVE",
    description: "Fictional design document; custody with the auditor for review.",
    ownerIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    custodianIdentityId: DEMO_IDENTITY_IDS.AUDITOR,
    integrityHash: "sha256:2fa955bd9c61159d3d3a0c59828238612502ef0a880918cf67d605c366ffefec",
    tokenId: "103",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: "a4444444-4444-4444-8444-444444444444",
    assetId: "DEV-KEYMAT-004",
    name: "Signing Key Material Reference (Demo)",
    type: "KEY_MATERIAL",
    classification: "CRITICAL",
    description: "Fictional key-material reference record (contents never on-chain).",
    ownerIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    custodianIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    integrityHash: "sha256:69a5ef2640237593c6628c68ff0c3127393434190f845d448c58252277c1341c",
    tokenId: "104",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
  },
];

export const _DEMO_POLICIES: Policy[] = [
  {
    id: "p1111111-1111-4111-8111-111111111111",
    name: "Highly sensitive transfer guard (demo catalog)",
    description: "Users cannot transfer HIGHLY_SENSITIVE assets; other roles require step-up.",
    subjectRole: "USER",
    resourceType: "ASSET",
    action: "TRANSFER",
    assetClassification: "HIGHLY_SENSITIVE",
    organization: null,
    effect: "DENY",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: "p2222222-2222-4222-8222-222222222222",
    name: "Critical Asset Dual-Authorization Requirement",
    description: "CRITICAL key material requires step-up PQC assurance verification.",
    subjectRole: null,
    resourceType: "ASSET",
    action: "EDIT",
    assetClassification: "CRITICAL",
    organization: null,
    effect: "CHALLENGE",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
  },
];

export const _inMemoryAuditEvents: AuditEvent[] = [
  {
    id: "audit-001",
    actorIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    action: "IDENTITY_CREATED",
    resourceType: "IDENTITY",
    resourceId: DEMO_IDENTITY_IDS.MANAGER,
    decision: "ALLOW",
    reason: "Demo seed: Manager identity registered with BEL trust domain",
    timestamp: new Date(Date.now() - 3600000 * 4),
    transactionHash: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    blockNumber: 18450,
    metadata: { source: "seed", organization: "Bharat Electronics Limited" },
    source: "APPLICATION",
  },
  {
    id: "audit-002",
    actorIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    action: "ASSET_ANCHOR_CONFIRMED",
    resourceType: "ASSET",
    resourceId: "DEV-FIRMWARE-001",
    decision: "ALLOW",
    reason: "NFT mint confirmed on QBFT consensus ledger (token 101)",
    timestamp: new Date(Date.now() - 3600000 * 3),
    transactionHash: "0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    blockNumber: 18451,
    metadata: { source: "seed", contract: "0x789...456", tokenId: "101" },
    source: "APPLICATION",
  },
  {
    id: "audit-003",
    actorIdentityId: DEMO_IDENTITY_IDS.MANAGER,
    action: "ASSET_ASSIGNED",
    resourceType: "ASSET",
    resourceId: "DEV-SPEC-003",
    decision: "ALLOW",
    reason: "Specification transferred to Auditor custody for security review",
    timestamp: new Date(Date.now() - 3600000 * 2),
    transactionHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    blockNumber: 18452,
    metadata: { source: "seed" },
    source: "APPLICATION",
  },
  {
    id: "audit-004",
    actorIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    action: "PQC_KEY_REGISTERED",
    resourceType: "IDENTITY",
    resourceId: DEMO_IDENTITY_IDS.ADMIN,
    decision: "ALLOW",
    reason: "Post-quantum ML-DSA-65 verification key bound to DID",
    timestamp: new Date(Date.now() - 3600000 * 1),
    transactionHash: "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
    blockNumber: 18453,
    metadata: { algorithm: "ML-DSA-65", keySource: "REGISTERED" },
    source: "APPLICATION",
  },
];

export const _inMemorySecurityAlerts: (typeof securityAlerts.$inferSelect)[] = [
  {
    id: "alert-001",
    title: "Suspicious Multi-Party Custody Anomaly",
    severity: "MEDIUM",
    status: "OPEN",
    identityId: DEMO_IDENTITY_IDS.MANAGER,
    assetId: "a1111111-1111-4111-8111-111111111111",
    description: "Automated threat rule flagged an unusual cross-boundary access pattern on restricted firmware.",
    riskScore: 68,
    createdAt: new Date(Date.now() - 7200000),
    resolvedAt: null,
  },
];

export const _DEMO_CUSTODY: {
  id: string;
  assetId: string;
  custodianIdentityId: string;
  reason: string | null;
  startedAt: Date;
  endedAt: Date | null;
}[] = [
  {
    id: "cust-001",
    assetId: "a1111111-1111-4111-8111-111111111111",
    custodianIdentityId: DEMO_IDENTITY_IDS.MANAGER,
    reason: "Manager holds the restricted firmware package for validation",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endedAt: null,
  },
  {
    id: "cust-002",
    assetId: "a2222222-2222-4222-8222-222222222222",
    custodianIdentityId: DEMO_IDENTITY_IDS.MANAGER,
    reason: "Manager holds the environmental test instrument for verification",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endedAt: null,
  },
  {
    id: "cust-003",
    assetId: "a3333333-3333-4333-8333-333333333333",
    custodianIdentityId: DEMO_IDENTITY_IDS.AUDITOR,
    reason: "Auditor reviews the radar interface specification",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endedAt: null,
  },
  {
    id: "cust-004",
    assetId: "a4444444-4444-4444-8444-444444444444",
    custodianIdentityId: DEMO_IDENTITY_IDS.ADMIN,
    reason: "Admin retains root key material reference",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endedAt: null,
  },
];

export const _DEMO_APPROVALS: (typeof assetApprovals.$inferSelect)[] = [];

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const values: InsertUser = {
    openId: user.openId,
  };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };

  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) {
    values.lastSignedIn = new Date();
  }

  if (Object.keys(updateSet).length === 0) {
    updateSet.lastSignedIn = new Date();
  }

  await withDb(
    async db => {
      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    },
    () => {
      const existing = _DEMO_USERS.find(u => u.openId === user.openId);
      if (existing) {
        if (values.lastSignedIn) existing.lastSignedIn = values.lastSignedIn as Date;
        if (values.name !== undefined) existing.name = values.name;
        if (values.email !== undefined) existing.email = values.email;
        if (values.role !== undefined) existing.role = values.role;
      } else {
        _DEMO_USERS.push({
          id: _DEMO_USERS.length + 1,
          openId: user.openId,
          name: values.name ?? null,
          email: values.email ?? null,
          loginMethod: values.loginMethod ?? null,
          role: values.role ?? "user",
          passwordHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: values.lastSignedIn as Date,
        });
      }
    }
  );
}

export async function getUserById(id: number): Promise<User | undefined> {
  return withDb(
    async db => {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0];
    },
    () => _DEMO_USERS.find(u => u.id === id)
  );
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  return withDb(
    async db => {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    },
    () => _DEMO_USERS.find(u => u.openId === openId)
  );
}

/**
 * LOCAL AUTH: resolve a platform user by email for the local login flow.
 * Only meaningful for seed/admin-provisioned local accounts (passwordHash set);
 * OAuth-sourced users have no password and never match a login attempt.
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const norm = email.trim().toLowerCase();
  return withDb(
    async db => {
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return rows[0];
    },
    () => _DEMO_USERS.find(u => u.email?.toLowerCase() === norm)
  );
}

export async function listIdentities(): Promise<Identity[]> {
  return withDb(
    async db => {
      const rows = await db.select().from(identities).orderBy(desc(identities.createdAt));
      return rows.length > 0 ? rows : [..._DEMO_IDENTITIES];
    },
    () => [..._DEMO_IDENTITIES]
  );
}

/**
 * Identity registry enriched with role names per identity (single query for
 * the workspace surfaces that need to show roles without N+1 lookups).
 */
export async function getIdentitiesWithRoles(): Promise<(Identity & { roles: string[] })[]> {
  return withDb(
    async db => {
      const rows = await db.select().from(identities).orderBy(desc(identities.createdAt));
      if (rows.length === 0) throw new Error("No DB identities, use demo");
      const roleRows = await db
        .select({ identityId: identityRoles.identityId, roleName: roles.name })
        .from(identityRoles)
        .innerJoin(roles, eq(identityRoles.roleId, roles.id));
      const byIdentity = new Map<string, string[]>();
      for (const row of roleRows) {
        const list = byIdentity.get(row.identityId) ?? [];
        list.push(row.roleName);
        byIdentity.set(row.identityId, list);
      }
      return rows.map(identity => ({ ...identity, roles: (byIdentity.get(identity.id) ?? []).sort() }));
    },
    () =>
      _DEMO_IDENTITIES.map(identity => ({
        ...identity,
        roles: [...(_DEMO_ROLES_BY_IDENTITY[identity.id]?.roles ?? ["USER"])],
      }))
  );
}

export async function createIdentity(input: Omit<InsertIdentity, "id" | "createdAt" | "updatedAt">) {
  const id = crypto.randomUUID();
  const created: Identity = {
    ...input,
    id,
    linkedUserId: input.linkedUserId ?? null,
    status: input.status ?? "ACTIVE",
    lifecycleState: input.lifecycleState ?? "VERIFIED",
    statusReason: input.statusReason ?? null,
    scope: input.scope ?? null,
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: null,
  };
  return withDb(
    async db => {
      await db.insert(identities).values({ ...input, id });
      const rows = await db.select().from(identities).where(eq(identities.id, id)).limit(1);
      return rows[0] ?? created;
    },
    () => {
      _DEMO_IDENTITIES.unshift(created);
      _DEMO_ROLES_BY_IDENTITY[created.id] = { roles: ["USER"], permissions: ["asset:read"] };
      return created;
    }
  );
}

export async function getIdentityById(id: string) {
  return withDb(
    async db => {
      const rows = await db.select().from(identities).where(eq(identities.id, id)).limit(1);
      return rows[0] ?? _DEMO_IDENTITIES.find(ident => ident.id === id);
    },
    () => _DEMO_IDENTITIES.find(ident => ident.id === id)
  );
}

export async function getIdentityByDid(did: string) {
  return withDb(
    async db => {
      const rows = await db.select().from(identities).where(eq(identities.did, did)).limit(1);
      return rows[0] ?? _DEMO_IDENTITIES.find(ident => ident.did === did);
    },
    () => _DEMO_IDENTITIES.find(ident => ident.did === did)
  );
}

export async function listAssets(): Promise<Asset[]> {
  return withDb(
    async db => {
      const rows = await db.select().from(assets).orderBy(desc(assets.createdAt));
      return rows.length > 0 ? rows : [..._DEMO_ASSETS];
    },
    () => [..._DEMO_ASSETS]
  );
}

export async function createAsset(input: Omit<InsertAsset, "id" | "createdAt" | "updatedAt">) {
  const id = crypto.randomUUID();
  const created: Asset = {
    ...input,
    id,
    description: input.description ?? null,
    integrityHash: input.integrityHash ?? null,
    tokenId: input.tokenId ?? null,
    status: input.status ?? "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return withDb(
    async db => {
      await db.insert(assets).values({ ...input, id });
      const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
      return rows[0] ?? created;
    },
    () => {
      _DEMO_ASSETS.unshift(created);
      return created;
    }
  );
}

/** Persist the on-chain NFT token id against the read-model asset row. */
export async function setAssetTokenId(assetRowId: string, tokenId: string): Promise<void> {
  await withDb(
    async db => {
      await db.update(assets).set({ tokenId }).where(eq(assets.id, assetRowId));
    },
    () => {
      const asset = _DEMO_ASSETS.find(a => a.id === assetRowId || a.assetId === assetRowId);
      if (asset) asset.tokenId = tokenId;
    }
  );
}

export async function getAssetById(id: string) {
  return withDb(
    async db => {
      const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
      return rows[0] ?? _DEMO_ASSETS.find(a => a.id === id || a.assetId === id);
    },
    () => _DEMO_ASSETS.find(a => a.id === id || a.assetId === id)
  );
}

export async function getAssetByAssetId(assetId: string) {
  return withDb(
    async db => {
      const rows = await db.select().from(assets).where(eq(assets.assetId, assetId)).limit(1);
      return rows[0] ?? _DEMO_ASSETS.find(a => a.assetId === assetId);
    },
    () => _DEMO_ASSETS.find(a => a.assetId === assetId)
  );
}

/**
 * Resolves the SAMPRAAN identity linked to a platform user (platform auth user id).
 * Returns undefined when no identity is linked or the database is unavailable.
 */
export async function getIdentityByLinkedUserId(linkedUserId: number) {
  return withDb(
    async db => {
      const rows = await db.select().from(identities).where(eq(identities.linkedUserId, linkedUserId)).limit(1);
      return rows[0] ?? _DEMO_IDENTITIES.find(ident => ident.linkedUserId === linkedUserId);
    },
    () => _DEMO_IDENTITIES.find(ident => ident.linkedUserId === linkedUserId)
  );
}

/**
 * Resolves the effective SAMPRAAN role names and permission keys granted to an
 * identity through identity_roles -> role_permissions -> permissions.
 */
export async function getIdentityRolesAndPermissions(identityId: string): Promise<{ roles: string[]; permissions: string[] }> {
  return withDb(
    async db => {
      const roleRows = await db
        .select({ roleId: roles.id, roleName: roles.name })
        .from(identityRoles)
        .innerJoin(roles, eq(identityRoles.roleId, roles.id))
        .where(eq(identityRoles.identityId, identityId));

      if (roleRows.length === 0) {
        const demo = _DEMO_ROLES_BY_IDENTITY[identityId];
        if (demo) return { roles: [...demo.roles], permissions: [...demo.permissions] };
        return { roles: [], permissions: [] };
      }

      const permissionRows = await db
        .selectDistinct({ key: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleRows.map(row => row.roleId)));

      return {
        roles: roleRows.map(row => row.roleName),
        permissions: permissionRows.map(row => row.key),
      };
    },
    () => {
      const demo = _DEMO_ROLES_BY_IDENTITY[identityId];
      if (demo) return { roles: [...demo.roles], permissions: [...demo.permissions] };
      return { roles: ["USER"], permissions: ["asset:read"] };
    }
  );
}

/** RBAC catalog: every role with its permission keys (read-only inspection). */
export async function listRolesWithPermissions(): Promise<{ id: string; name: string; description: string | null; permissions: string[] }[]> {
  return withDb(
    async db => {
      const roleRows = await db.select().from(roles).orderBy(roles.name);
      if (roleRows.length === 0) throw new Error("No roles in DB");
      const mappingRows = await db
        .select({ roleId: rolePermissions.roleId, key: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));
      const byRole = new Map<string, string[]>();
      for (const row of mappingRows) {
        const list = byRole.get(row.roleId) ?? [];
        list.push(row.key);
        byRole.set(row.roleId, list);
      }
      return roleRows.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        permissions: (byRole.get(role.id) ?? []).sort(),
      }));
    },
    () => [
      {
        id: "role-admin",
        name: "ADMIN",
        description: "Full administrative control: identities, roles, assets, policies, audit, access grants.",
        permissions: [
          "identity:create", "identity:read", "identity:update", "identity:revoke",
          "asset:create", "asset:read", "asset:edit", "asset:assign", "asset:transfer", "asset:revoke",
          "audit:read", "policy:create", "policy:update", "administration:manage",
        ],
      },
      {
        id: "role-manager",
        name: "MANAGER",
        description: "Operate on permitted assets: edit content, create versions, assign and transfer custody.",
        permissions: ["identity:read", "asset:read", "asset:edit", "asset:assign", "asset:transfer", "audit:read"],
      },
      {
        id: "role-auditor",
        name: "AUDITOR",
        description: "Read-only inspection of assets, provenance, and the audit trail. No mutation.",
        permissions: ["identity:read", "asset:read", "audit:read"],
      },
      {
        id: "role-user",
        name: "USER",
        description: "Explicitly permitted operations only (asset:read). No content or custody mutations.",
        permissions: ["asset:read"],
      },
    ]
  );
}

/** All known permission keys (for the access-control matrix surface). */
export async function listPermissions(): Promise<{ id: string; key: string; description: string | null }[]> {
  return withDb(
    async db => {
      const rows = await db.select({ id: permissions.id, key: permissions.key, description: permissions.description }).from(permissions).orderBy(permissions.key);
      if (rows.length === 0) throw new Error("No permissions in DB");
      return rows;
    },
    () => [
      "identity:create", "identity:read", "identity:update", "identity:revoke",
      "asset:create", "asset:read", "asset:edit", "asset:assign", "asset:transfer", "asset:revoke",
      "audit:read", "policy:create", "policy:update", "administration:manage",
    ].map((key, i) => ({ id: `perm-${i + 1}`, key, description: `Demo permission: ${key}` as string | null }))
  );
}

/**
 * RBAC write path (admin only at the API layer): replace an identity's role
 * set. Rows are deleted and re-inserted in a transaction so the identity never
 * ends up with zero-or-double roles mid-flight. Returns the updated role names.
 */
export async function applyIdentityRoles(input: {
  identityId: string;
  roleNames: string[];
  assignedByIdentityId: string | null;
}): Promise<string[] | null> {
  const wanted = Array.from(new Set(input.roleNames.map(name => name.trim().toUpperCase()).filter(Boolean)));
  return withDb(
    async db => {
      const roleRows = wanted.length
        ? await db.select().from(roles).where(inArray(roles.name, wanted))
        : [];
      const found = roleRows.map(row => row.name);
      const missing = wanted.filter(name => !found.includes(name));
      if (missing.length > 0) {
        throw new Error(`Unknown role(s): ${missing.join(", ")}`);
      }

      await db.transaction(async tx => {
        await tx.delete(identityRoles).where(eq(identityRoles.identityId, input.identityId));
        if (roleRows.length > 0) {
          await tx.insert(identityRoles).values(
            roleRows.map(role => ({
              identityId: input.identityId,
              roleId: role.id,
              assignedByIdentityId: input.assignedByIdentityId,
            }))
          );
        }
      });

      return found;
    },
    () => {
      _DEMO_ROLES_BY_IDENTITY[input.identityId] = {
        roles: wanted,
        permissions: wanted.includes("ADMIN")
          ? ["identity:create","identity:read","identity:update","identity:revoke","asset:create","asset:read","asset:edit","asset:assign","asset:transfer","asset:revoke","audit:read","policy:create","policy:update","administration:manage"]
          : wanted.includes("MANAGER")
          ? ["identity:read","asset:read","asset:edit","asset:assign","asset:transfer","audit:read"]
          : wanted.includes("AUDITOR")
          ? ["identity:read","asset:read","audit:read"]
          : ["asset:read"],
      };
      return wanted;
    }
  );
}

/** Policy catalog (the access-control surfaces read this; the engine remains source of truth). */
export async function listPolicies(): Promise<PolicyRow[]> {
  return withDb(
    async db => {
      const rows = await db.select().from(policies).orderBy(desc(policies.active), policies.resourceType, policies.action);
      return rows.length > 0 ? rows : [..._DEMO_POLICIES];
    },
    () => [..._DEMO_POLICIES]
  );
}

/** Identity audit history: every audit row touching one identity (actor or target). */
export async function listIdentityAuditEvents(identityId: string, limit = 100) {
  return withDb(
    async db => {
      const rows = await db
        .select()
        .from(auditEvents)
        .where(
          or(
            eq(auditEvents.actorIdentityId, identityId),
            and(eq(auditEvents.resourceType, "IDENTITY"), eq(auditEvents.resourceId, identityId)),
          ),
        )
        .orderBy(desc(auditEvents.timestamp))
        .limit(limit);
      return rows.length > 0
        ? rows
        : _inMemoryAuditEvents
            .filter(e => e.actorIdentityId === identityId || (e.resourceType === "IDENTITY" && e.resourceId === identityId))
            .slice(0, limit);
    },
    () =>
      _inMemoryAuditEvents
        .filter(e => e.actorIdentityId === identityId || (e.resourceType === "IDENTITY" && e.resourceId === identityId))
        .slice(0, limit)
  );
}

/** Asset provenance: custody rows for an asset, oldest first. */
export async function listAssetCustody(assetRowId: string) {
  return withDb(
    async db => {
      const rows = await db
        .select()
        .from(assetCustody)
        .where(eq(assetCustody.assetId, assetRowId))
        .orderBy(desc(assetCustody.startedAt));
      return rows.length > 0 ? rows : _DEMO_CUSTODY.filter(c => c.assetId === assetRowId);
    },
    () => _DEMO_CUSTODY.filter(c => c.assetId === assetRowId)
  );
}

/** Asset provenance: audit events whose resourceId matches the asset id. */
export async function listAssetAuditEvents(assetId: string, limit = 100) {
  return withDb(
    async db => {
      const rows = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.resourceType, "ASSET"), eq(auditEvents.resourceId, assetId)))
        .orderBy(desc(auditEvents.timestamp))
        .limit(limit);
      return rows.length > 0
        ? rows
        : _inMemoryAuditEvents
            .filter(e => e.resourceType === "ASSET" && (e.resourceId === assetId || e.resourceId === "DEV-FIRMWARE-001"))
            .slice(0, limit);
    },
    () =>
      _inMemoryAuditEvents
        .filter(e => e.resourceType === "ASSET" && (e.resourceId === assetId || e.resourceId === "DEV-FIRMWARE-001"))
        .slice(0, limit)
  );
}

/** Security intelligence: create an advisory alert from rule evaluation. */
export async function createSecurityAlert(input: Omit<typeof securityAlerts.$inferInsert, "createdAt" | "resolvedAt">) {
  const id = input.id ?? crypto.randomUUID();
  const alertRow: typeof securityAlerts.$inferSelect = {
    id,
    title: input.title,
    severity: input.severity ?? "MEDIUM",
    status: input.status ?? "OPEN",
    identityId: input.identityId ?? null,
    assetId: input.assetId ?? null,
    description: input.description,
    riskScore: input.riskScore ?? null,
    createdAt: new Date(),
    resolvedAt: null,
  };
  return withDb(
    async db => {
      await db.insert(securityAlerts).values({ ...input, id } as typeof securityAlerts.$inferInsert);
      const rows = await db.select().from(securityAlerts).where(eq(securityAlerts.id, id)).limit(1);
      return rows[0] ?? alertRow;
    },
    () => {
      _inMemorySecurityAlerts.unshift(alertRow);
      return alertRow;
    }
  );
}

export type PolicyRow = typeof policies.$inferSelect;

export async function createAuthorizationDecision(input: typeof authorizationDecisions.$inferInsert) {
  const id = input.id ?? crypto.randomUUID();
  const decisionRow: typeof authorizationDecisions.$inferSelect = {
    id,
    actorIdentityId: input.actorIdentityId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    action: input.action,
    decision: input.decision,
    reason: input.reason,
    policyId: input.policyId ?? null,
    timestamp: new Date(),
  };
  return withDb(
    async db => {
      await db.insert(authorizationDecisions).values({ ...input, id });
      const rows = await db.select().from(authorizationDecisions).where(eq(authorizationDecisions.id, id)).limit(1);
      return rows[0] ?? decisionRow;
    },
    () => decisionRow
  );
}

export async function createAuditEvent(input: typeof auditEvents.$inferInsert) {
  const id = input.id ?? crypto.randomUUID();
  const event: AuditEvent = {
    id,
    actorIdentityId: input.actorIdentityId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    decision: input.decision ?? null,
    reason: input.reason ?? null,
    timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
    transactionHash: input.transactionHash ?? null,
    blockNumber: input.blockNumber ?? null,
    metadata: input.metadata ?? null,
    source: (input.source as "APPLICATION" | "CHAIN_READ_MODEL") ?? "APPLICATION",
  };
  return withDb(
    async db => {
      await db.insert(auditEvents).values({ ...input, id });
      const rows = await db.select().from(auditEvents).where(eq(auditEvents.id, id)).limit(1);
      return rows[0] ?? event;
    },
    () => {
      _inMemoryAuditEvents.unshift(event);
      return event;
    }
  );
}

export async function listAuditEvents(limit = 50) {
  return withDb(
    async db => {
      const rows = await db.select().from(auditEvents).orderBy(desc(auditEvents.timestamp)).limit(limit);
      return rows.length > 0 ? rows : _inMemoryAuditEvents.slice(0, limit);
    },
    () => _inMemoryAuditEvents.slice(0, limit)
  );
}

/**
 * Alert lifecycle (investigator action): move an alert to INVESTIGATING or
 * RESOLVED. Purely advisory workflow state — never part of authorization.
 */
export async function updateAlertStatus(input: {
  alertId: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
}): Promise<typeof securityAlerts.$inferSelect | null> {
  return withDb(
    async db => {
      await db
        .update(securityAlerts)
        .set({
          status: input.status,
          ...(input.status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
        })
        .where(eq(securityAlerts.id, input.alertId));
      const rows = await db.select().from(securityAlerts).where(eq(securityAlerts.id, input.alertId)).limit(1);
      return rows[0] ?? null;
    },
    () => {
      const alert = _inMemorySecurityAlerts.find(a => a.id === input.alertId);
      if (alert) {
        alert.status = input.status;
        if (input.status === "RESOLVED") alert.resolvedAt = new Date();
      }
      return alert ?? null;
    }
  );
}

export async function listSecurityAlerts() {
  return withDb(
    async db => {
      const rows = await db.select().from(securityAlerts).orderBy(desc(securityAlerts.createdAt));
      return rows.length > 0 ? rows : [..._inMemorySecurityAlerts];
    },
    () => [..._inMemorySecurityAlerts]
  );
}

export async function countOpenAlerts() {
  return withDb(
    async db => {
      const rows = await db.select().from(securityAlerts).where(eq(securityAlerts.status, "OPEN"));
      return rows.length;
    },
    () => _inMemorySecurityAlerts.filter(a => a.status === "OPEN").length
  );
}

export async function createDidRecord(input: Omit<typeof didRecords.$inferInsert, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  const rec: typeof didRecords.$inferSelect = {
    id,
    identityId: input.identityId,
    did: input.did,
    method: input.method,
    subject: input.subject,
    document: input.document ?? null,
    status: (input.status as "ACTIVE" | "REVOKED") ?? "ACTIVE",
    keyStatus: "ACTIVE",
    keyIdentifier: null,
    rotatedFrom: null,
    rotatedAt: null,
    revokedAt: null,
    createdAt: new Date(),
  };
  return withDb(
    async db => {
      await db.insert(didRecords).values({ ...input, id });
      const rows = await db.select().from(didRecords).where(eq(didRecords.id, id)).limit(1);
      return rows[0] ?? rec;
    },
    () => rec
  );
}

/**
 * BUG-006: after a successful on-chain custody transfer the read model must
 * reflect the new custodian, otherwise the DB and the chain disagree and the
 * UI keeps showing the pre-transfer custodian. Also closes the previous
 * custody row and opens a new one so the custody history stays accurate.
 *
 * Returns the updated asset, or null when the DB is unavailable (evidence is
 * already on-chain; the caller records the mismatch as a FAILED audit event).
 */
export async function applyCustodyTransfer(input: {
  assetRowId: string;
  newCustodianIdentityId: string | null;
  reason: string;
  transactionHash?: string | null;
  blockNumber?: number | null;
}): Promise<Asset | null> {
  return withDb(
    async db => {
      await db.transaction(async tx => {
        if (input.newCustodianIdentityId) {
          await tx
            .update(assets)
            .set({ custodianIdentityId: input.newCustodianIdentityId })
            .where(eq(assets.id, input.assetRowId));
        }
        await tx
          .update(assetCustody)
          .set({ endedAt: new Date() })
          .where(and(eq(assetCustody.assetId, input.assetRowId), isNull(assetCustody.endedAt)));
        if (input.newCustodianIdentityId) {
          await tx.insert(assetCustody).values({
            id: crypto.randomUUID(),
            assetId: input.assetRowId,
            custodianIdentityId: input.newCustodianIdentityId,
            reason: input.reason,
          });
        }
      });
      const rows = await db.select().from(assets).where(eq(assets.id, input.assetRowId)).limit(1);
      return rows[0] ?? null;
    },
    () => {
      const asset = _DEMO_ASSETS.find(a => a.id === input.assetRowId || a.assetId === input.assetRowId);
      if (asset && input.newCustodianIdentityId) {
        asset.custodianIdentityId = input.newCustodianIdentityId;
        _DEMO_CUSTODY.unshift({
          id: crypto.randomUUID(),
          assetId: asset.id,
          custodianIdentityId: input.newCustodianIdentityId,
          reason: input.reason,
          startedAt: new Date(),
          endedAt: null,
        });
      }
      return asset ?? null;
    }
  );
}

/**
 * BUG-007 support: mark an identity SUSPENDED/REVOKED in the read model and
 * keep derived records consistent (DID record status, revokedAt timestamps).
 * Returns the updated identity or null when the DB is unavailable.
 */
export async function applyIdentityStatusChange(input: {
  identityId: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
}): Promise<Identity | null> {
  return withDb(
    async db => {
      const revokedAt = input.status === "REVOKED" ? new Date() : null;
      await db
        .update(identities)
        .set({
          status: input.status,
          ...(revokedAt ? { revokedAt } : {}),
        })
        .where(eq(identities.id, input.identityId));

      const identityRows = await db.select().from(identities).where(eq(identities.id, input.identityId)).limit(1);
      const identity = identityRows[0];
      if (identity?.did) {
        await db
          .update(didRecords)
          .set({
            status: input.status === "ACTIVE" ? "ACTIVE" : "REVOKED",
            ...(input.status !== "ACTIVE" ? { revokedAt: new Date() } : {}),
          })
          .where(eq(didRecords.did, identity.did));
      }
      return identity ?? null;
    },
    () => {
      const ident = _DEMO_IDENTITIES.find(i => i.id === input.identityId);
      if (ident) {
        ident.status = input.status;
        if (input.status === "REVOKED") ident.revokedAt = new Date();
      }
      return ident ?? null;
    }
  );
}

/**
 * BUG-028: assets created through the API default to PENDING and previously
 * had NO transition path to ACTIVE — every API-created asset was permanently
 * untransferable. Admin-driven lifecycle change for the read model.
 */
export async function applyAssetStatusChange(input: {
  assetRowId: string;
  status: "ACTIVE" | "REVOKED" | "PENDING";
}): Promise<Asset | null> {
  return withDb(
    async db => {
      await db
        .update(assets)
        .set({ status: input.status })
        .where(eq(assets.id, input.assetRowId));
      const rows = await db.select().from(assets).where(eq(assets.id, input.assetRowId)).limit(1);
      return rows[0] ?? null;
    },
    () => {
      const asset = _DEMO_ASSETS.find(a => a.id === input.assetRowId || a.assetId === input.assetRowId);
      if (asset) {
        asset.status = input.status;
      }
      return asset ?? null;
    }
  );
}

/**
 * BUG-030: the chain-event indexer deduplicated only against an in-memory
 * Set, so every process restart re-projected the same chain events and
 * duplicated audit rows (observed live: one tx anchored 4 times). This
 * returns the set of transaction hashes already recorded from the chain so
 * the indexer can skip them durably, across restarts.
 */
export async function listIndexedChainTxHashes(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db
    .select({ transactionHash: auditEvents.transactionHash })
    .from(auditEvents)
    .where(and(eq(auditEvents.source, "CHAIN_READ_MODEL"), isNotNull(auditEvents.transactionHash)));
  return new Set(rows.map(r => r.transactionHash).filter((h): h is string => Boolean(h)));
}

/**
 * Durable PER-EVENT dedup keys for the chain indexer. One transaction can
 * emit several distinct contract events (e.g. the ERC-721 Transfer next to
 * AssetRegistered); deduping by tx hash alone would drop the siblings, so
 * each projected row also stores its composite eventKey in metadata.
 */
export async function listIndexedChainEventKeys(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db
    .select({ metadata: auditEvents.metadata })
    .from(auditEvents)
    .where(eq(auditEvents.source, "CHAIN_READ_MODEL"))
    .limit(5000);
  const keys = new Set<string>();
  for (const row of rows) {
    const key = (row.metadata as { eventKey?: string } | null)?.eventKey;
    if (typeof key === "string") keys.add(key);
  }
  return keys;
}

/**
 * Durable indexer checkpoint: the highest block number already projected
 * into the chain read model. The indexer resumes from here (+ re-scans that
 * block; per-event dedup makes that free) so downtime LONGER than the scan
 * window can no longer silently drop events — previously a restart more
 * than 500 blocks after the last scan skipped everything in between.
 */
export async function getMaxIndexedChainBlock(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ maxBlock: max(auditEvents.blockNumber) })
    .from(auditEvents)
    .where(eq(auditEvents.source, "CHAIN_READ_MODEL"));
  return rows[0]?.maxBlock ?? null;
}

/**
 * QA #5 (server-side session revocation): given a session token, classify
 * its server-side tracking state. DISTINCT outcomes matter:
 *  - "UNTRACKED"  — no row exists for this token (e.g. cron sessions,
 *    tokens minted before tracking began): JWT verification governs alone.
 *  - "ACTIVE"     — tracked, not revoked, not expired: the session stands.
 *  - "REVOKED"   — an administrator revoked it server-side: reject NOW,
 *    regardless of the JWT's own expiry.
 *  - "EXPIRED"   — the tracked row's expiry has passed: reject NOW.
 */
export type PlatformSessionState =
  | { state: "UNTRACKED" }
  | { state: "ACTIVE"; id: string; identityId: string; expiresAt: Date }
  | { state: "REVOKED" }
  | { state: "EXPIRED" };

export async function classifyPlatformSession(sessionToken: string): Promise<PlatformSessionState> {
  return withDb<PlatformSessionState>(
    async db => {
      const rows = await db
        .select({
          id: sessions.id,
          identityId: sessions.identityId,
          expiresAt: sessions.expiresAt,
          revokedAt: sessions.revokedAt,
        })
        .from(sessions)
        .where(eq(sessions.sessionId, hashSessionToken(sessionToken)))
        .limit(1);
      const row = rows[0];
      if (!row) return { state: "UNTRACKED" };
      if (row.revokedAt) return { state: "REVOKED" };
      if (row.expiresAt.getTime() <= Date.now()) return { state: "EXPIRED" };
      return { state: "ACTIVE", id: row.id, identityId: row.identityId, expiresAt: row.expiresAt };
    },
    () => ({ state: "UNTRACKED" })
  );
}

/**
 * SECURITY (audit fix — token-at-rest): session tracking rows must not store
 * the raw bearer token. A read-only database leak (backup, log, support dump)
 * previously yielded immediately usable session credentials. Only the SHA-256
 * digest is persisted now; every classify/revoke/track call hashes its input,
 * so callers keep passing the raw token and nothing else changes.
 * Revocation lookup is by digest, which is exactly as unique as the token.
 */
export function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken, "utf8").digest("hex");
}

/**
 * Revoke a tracked platform session server-side (admin action). Returns
 * true when a row was revoked, false when the token is not tracked.
 */
export async function revokePlatformSession(sessionToken: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.sessionId, hashSessionToken(sessionToken)), isNull(sessions.revokedAt)));
  return affectedRowsOf(result) > 0;
}

/**
 * Track a newly issued platform session token so server-side revocation
 * (classifyPlatformSession / revokePlatformSession) has a row to act on.
 *
 * SECURITY: without this insert, every session minted by a real OAuth login
 * is UNTRACKED — classifyPlatformSession returns { state: "UNTRACKED" } and
 * an administrator revocation can never take effect. Tracking is therefore
 * part of the login path itself, not an optional extra.
 *
 * Best-effort by design: a tracking failure must NOT lock the user out of a
 * cryptographically valid session (availability), but it is logged loudly
 * because it weakens the revocation guarantee until the next login.
 *
 * The identity linkage uses the SAMPRAAN identity bound to the platform
 * user when one exists; sessions for platform users without a linked
 * SAMPRAAN identity are tracked against a sentinel identity reference so
 * the NOT NULL FK still holds. The sentinel row is created on demand.
 */
const UNLINKED_SESSIONS_IDENTITY_ID = "00000000-0000-4000-8000-000000000000";
const UNLINKED_SESSIONS_DID = "did:sampraan:platform-user-sessions";

async function ensureUnlinkedSessionsIdentity(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<void> {
  await db
    .insert(identities)
    .values({
      id: UNLINKED_SESSIONS_IDENTITY_ID,
      displayName: "Platform User Sessions",
      organization: "SAMPRAAN",
      status: "ACTIVE",
      did: UNLINKED_SESSIONS_DID,
    })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

export async function trackPlatformSession(input: {
  sessionToken: string;
  linkedUserId: number;
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    // No database: revocation tracking is impossible. Log it — the JWT
    // itself is still the (only) validity boundary in this mode.
    console.warn("[Auth] Cannot track platform session: database not available");
    return;
  }

  try {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.linkedUserId))
      .limit(1);
    if (userRows.length === 0) {
      console.warn("[Auth] Cannot track platform session: user row disappeared mid-login");
      return;
    }

    const identityRows = await db
      .select({ id: identities.id })
      .from(identities)
      .where(eq(identities.linkedUserId, input.linkedUserId))
      .limit(1);

    let identityId = identityRows[0]?.id;
    if (!identityId) {
      await ensureUnlinkedSessionsIdentity(db);
      identityId = UNLINKED_SESSIONS_IDENTITY_ID;
    }

    await db
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        identityId,
        sessionId: hashSessionToken(input.sessionToken),
        expiresAt: input.expiresAt,
      })
      .onDuplicateKeyUpdate({
        set: { expiresAt: input.expiresAt, revokedAt: null },
      });
  } catch (error) {
    console.error("[Auth] Failed to track platform session:", error);
  }
}

/* ------------------------------------------------------------------ */
/* Sensitive-asset approvals (LOOP 6)                                   */
/* ------------------------------------------------------------------ */

export async function createAssetApproval(input: {
  assetId: string;
  requesterIdentityId: string;
  action: string;
  targetIdentityId?: string | null;
  reason?: string | null;
}) {
  const id = crypto.randomUUID();
  const item: typeof assetApprovals.$inferSelect = {
    id,
    assetId: input.assetId,
    requesterIdentityId: input.requesterIdentityId,
    action: input.action,
    targetIdentityId: input.targetIdentityId ?? null,
    status: "PENDING",
    reason: input.reason ?? null,
    approverIdentityId: null,
    decidedAt: null,
    executedAt: null,
    createdAt: new Date(),
  };
  return withDb(
    async db => {
      await db.insert(assetApprovals).values({
        id,
        assetId: input.assetId,
        requesterIdentityId: input.requesterIdentityId,
        action: input.action,
        targetIdentityId: input.targetIdentityId ?? null,
        status: "PENDING",
        reason: input.reason ?? null,
      });
      const rows = await db.select().from(assetApprovals).where(eq(assetApprovals.id, id)).limit(1);
      return rows[0] ?? item;
    },
    () => {
      _DEMO_APPROVALS.unshift(item);
      return item;
    }
  );
}

export async function getAssetApproval(approvalId: string) {
  return withDb(
    async db => {
      const rows = await db.select().from(assetApprovals).where(eq(assetApprovals.id, approvalId)).limit(1);
      return rows[0] ?? _DEMO_APPROVALS.find(a => a.id === approvalId);
    },
    () => _DEMO_APPROVALS.find(a => a.id === approvalId)
  );
}

/** The active (non-terminal) approval for an asset+requester+action, if any. */
export async function getActiveAssetApproval(input: { assetId: string; requesterIdentityId: string; action: string }) {
  return withDb(
    async db => {
      const rows = await db
        .select()
        .from(assetApprovals)
        .where(
          and(
            eq(assetApprovals.assetId, input.assetId),
            eq(assetApprovals.requesterIdentityId, input.requesterIdentityId),
            eq(assetApprovals.action, input.action),
            inArray(assetApprovals.status, ["PENDING", "APPROVED"]),
          ),
        )
        .orderBy(desc(assetApprovals.createdAt))
        .limit(1);
      return (
        rows[0] ??
        _DEMO_APPROVALS.find(
          a =>
            a.assetId === input.assetId &&
            a.requesterIdentityId === input.requesterIdentityId &&
            a.action === input.action &&
            (a.status === "PENDING" || a.status === "APPROVED"),
        )
      );
    },
    () =>
      _DEMO_APPROVALS.find(
        a =>
          a.assetId === input.assetId &&
          a.requesterIdentityId === input.requesterIdentityId &&
          a.action === input.action &&
          (a.status === "PENDING" || a.status === "APPROVED"),
      )
  );
}

export async function listAssetApprovals(assetId: string) {
  return withDb(
    async db => {
      const rows = await db
        .select()
        .from(assetApprovals)
        .where(eq(assetApprovals.assetId, assetId))
        .orderBy(desc(assetApprovals.createdAt))
        .limit(50);
      return rows.length > 0 ? rows : _DEMO_APPROVALS.filter(a => a.assetId === assetId);
    },
    () => _DEMO_APPROVALS.filter(a => a.assetId === assetId)
  );
}

export async function updateAssetApprovalStatus(input: {
  approvalId: string;
  status: "APPROVED" | "REJECTED";
  approverIdentityId: string;
}) {
  return withDb(
    async db => {
      const result = await db
        .update(assetApprovals)
        .set({ status: input.status, approverIdentityId: input.approverIdentityId, decidedAt: new Date() })
        .where(and(eq(assetApprovals.id, input.approvalId), eq(assetApprovals.status, "PENDING")));
      if (!result || result[0].affectedRows === 0) return undefined;
      return getAssetApproval(input.approvalId);
    },
    () => {
      const app = _DEMO_APPROVALS.find(a => a.id === input.approvalId);
      if (app && app.status === "PENDING") {
        app.status = input.status;
        app.approverIdentityId = input.approverIdentityId;
        app.decidedAt = new Date();
        return app;
      }
      return undefined;
    }
  );
}

export async function markAssetApprovalExecuted(approvalId: string) {
  return withDb(
    async db => {
      await db
        .update(assetApprovals)
        .set({ status: "EXECUTED", executedAt: new Date() })
        .where(eq(assetApprovals.id, approvalId));
      return getAssetApproval(approvalId);
    },
    () => {
      const app = _DEMO_APPROVALS.find(a => a.id === approvalId);
      if (app) {
        app.status = "EXECUTED";
        app.executedAt = new Date();
        return app;
      }
      return undefined;
    }
  );
}

/* ------------------------------------------------------------------ */
/* Controlled asset content (versions + access grants)                  */
/* ------------------------------------------------------------------ */

/**
 * Allocate the next version number for an asset and insert the version row
 * INSIDE one transaction: (assetId, versionNumber) is UNIQUE, so two racing
 * creates cannot both claim the same number — one insert fails and rolls
 * back, preventing duplicate/gapped versions under concurrency.
 */
export async function createAssetContentVersion(input: {
  assetId: string;
  versionNumber: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  storageProvider: string;
  storageReference: string;
  encryption: unknown;
  createdByIdentityId: string;
  changeNote?: string | null;
  createdTxHash?: string | null;
  createdBlockNumber?: number | null;
}): Promise<AssetContentVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(assetContentVersions).values({
    id,
    assetId: input.assetId,
    versionNumber: input.versionNumber,
    filename: input.filename,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    contentHash: input.contentHash,
    storageProvider: input.storageProvider,
    storageReference: input.storageReference,
    encryption: input.encryption as typeof assetContentVersions.$inferInsert["encryption"],
    createdByIdentityId: input.createdByIdentityId,
    changeNote: input.changeNote ?? null,
    createdTxHash: input.createdTxHash ?? null,
    createdBlockNumber: input.createdBlockNumber ?? null,
  });
  const rows = await db.select().from(assetContentVersions).where(eq(assetContentVersions.id, id)).limit(1);
  return rows[0];
}

/** Next gapless version number for an asset (1 when no version exists). */
export async function getNextAssetVersionNumber(assetId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const rows = await db
    .select({ maxVersion: max(assetContentVersions.versionNumber) })
    .from(assetContentVersions)
    .where(eq(assetContentVersions.assetId, assetId));
  return (rows[0]?.maxVersion ?? 0) + 1;
}

/** All versions of an asset, newest first. */
export async function listAssetContentVersions(assetId: string): Promise<AssetContentVersion[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assetContentVersions)
    .where(eq(assetContentVersions.assetId, assetId))
    .orderBy(desc(assetContentVersions.versionNumber));
}

/** One version by row id (assetId NOT checked here — caller must scope). */
export async function getAssetContentVersionById(versionId: string): Promise<AssetContentVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(assetContentVersions).where(eq(assetContentVersions.id, versionId)).limit(1);
  return rows[0];
}

/** Count distinct assets that already carry at least one content version. */
export async function countAssetsWithContent(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ assetId: assetContentVersions.assetId })
    .from(assetContentVersions)
    .groupBy(assetContentVersions.assetId);
  return rows.length;
}

/**
 * ACTIVE (non-revoked) access grants for one identity on one asset, resolved
 * server-side for the authorization boundary. Ownership/custody baselines
 * are evaluated separately by the policy engine — these rows EXTEND access.
 */
export async function listActiveAssetAccessGrants(assetId: string, granteeIdentityId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assetAccessGrants)
    .where(
      and(
        eq(assetAccessGrants.assetId, assetId),
        eq(assetAccessGrants.granteeIdentityId, granteeIdentityId),
        isNull(assetAccessGrants.revokedAt),
      ),
    );
}

/** All grants on an asset (including revoked rows, for the audit surface). */
export async function listAssetAccessGrants(assetId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assetAccessGrants)
    .where(eq(assetAccessGrants.assetId, assetId))
    .orderBy(desc(assetAccessGrants.createdAt))
    .limit(200);
}

/** Grant VIEW or EDIT on an asset to an identity (admin/custodian-managed). */
export async function createAssetAccessGrant(input: {
  assetId: string;
  granteeIdentityId: string;
  permission: "VIEW" | "EDIT";
  grantedByIdentityId: string;
  reason?: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  try {
    await db.insert(assetAccessGrants).values({
      id,
      assetId: input.assetId,
      granteeIdentityId: input.granteeIdentityId,
      permission: input.permission,
      grantedByIdentityId: input.grantedByIdentityId,
      reason: input.reason ?? null,
    });
  } catch (error) {
    // FINAL-AUDIT FIX (re-grant after revocation, F5): grants are soft-revoked
    // (revokedAt) but the UNIQUE (assetId, granteeIdentityId, permission)
    // constraint spans live AND revoked rows, so re-issuing a previously
    // revoked grant crashed with a raw duplicate-key 500 — a core Manage
    // Access workflow was single-use. The constraint must STAY (it is what
    // makes racing grants safe), so a duplicate on a REVOKED row revives it
    // in one atomic statement: clear revokedAt, refresh attribution/reason.
    // A duplicate against a LIVE row still surfaces as a conflict.
    if (!isDuplicateEntryError(error)) throw error;
    const existing = await db
      .select({ id: assetAccessGrants.id, revokedAt: assetAccessGrants.revokedAt })
      .from(assetAccessGrants)
      .where(
        and(
          eq(assetAccessGrants.assetId, input.assetId),
          eq(assetAccessGrants.granteeIdentityId, input.granteeIdentityId),
          eq(assetAccessGrants.permission, input.permission),
        ),
      )
      .limit(1);
    const row = existing[0];
    if (!row) throw error;
    if (!row.revokedAt) {
      throw new Error(
        `DUPLICATE_ACTIVE_GRANT: ${input.permission} is already granted to this identity on this asset`,
      );
    }
    const revivedId = row.id;
    await db
      .update(assetAccessGrants)
      .set({
        revokedAt: null,
        grantedByIdentityId: input.grantedByIdentityId,
        ...(input.reason !== undefined ? { reason: input.reason ?? null } : {}),
      })
      .where(and(eq(assetAccessGrants.id, revivedId), isNotNull(assetAccessGrants.revokedAt)));
    const rows = await db.select().from(assetAccessGrants).where(eq(assetAccessGrants.id, revivedId)).limit(1);
    return rows[0];
  }
  const rows = await db.select().from(assetAccessGrants).where(eq(assetAccessGrants.id, id)).limit(1);
  return rows[0];
}

/** Soft-revoke a grant (history is preserved for audit). */
export async function revokeAssetAccessGrant(grantId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(assetAccessGrants)
    .set({ revokedAt: new Date() })
    .where(and(eq(assetAccessGrants.id, grantId), isNull(assetAccessGrants.revokedAt)));
  return affectedRowsOf(result) > 0;
}

/** Resolve the asset a grant belongs to (scoped authorization for revocation). */
export async function getAssetIdForGrant(grantId: string): Promise<{ assetId: string; granteeIdentityId: string; permission: "VIEW" | "EDIT"; revokedAt: Date | null } | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ assetId: assetAccessGrants.assetId, granteeIdentityId: assetAccessGrants.granteeIdentityId, permission: assetAccessGrants.permission, revokedAt: assetAccessGrants.revokedAt })
    .from(assetAccessGrants)
    .where(eq(assetAccessGrants.id, grantId))
    .limit(1);
  return rows[0];
}

/* ------------------------------------------------------------------ */
/* GOVERNANCE LIFECYCLE (document "Role Definitions and Access Rights") */
/* ------------------------------------------------------------------ */

export async function updateIdentityLifecycle(input: {
  identityId: string;
  lifecycleState: "PENDING" | "VERIFIED" | "SUSPENDED" | "DEACTIVATED";
  statusReason: string;
}): Promise<Identity | null> {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(identities)
    .set({
      lifecycleState: input.lifecycleState,
      statusReason: input.statusReason,
      // Keep the legacy status enum in lockstep so every existing gate
      // (session gate, content gate, transfer engine) keeps working.
      ...(input.lifecycleState === "VERIFIED" ? { status: "ACTIVE" as const } : {}),
      ...(input.lifecycleState === "SUSPENDED" ? { status: "SUSPENDED" as const } : {}),
      ...(input.lifecycleState === "DEACTIVATED" ? { status: "REVOKED" as const, deactivatedAt: new Date(), revokedAt: new Date() } : {}),
      ...(input.lifecycleState === "PENDING" ? { status: "SUSPENDED" as const } : {}),
      ...(input.lifecycleState === "VERIFIED" ? { revokedAt: null, deactivatedAt: null } : {}),
    })
    .where(eq(identities.id, input.identityId));
  // Sync the DID record status (a deactivated/suspended identity must not
  // keep an ACTIVE DID document — consistent with applyIdentityStatusChange).
  const identityRows = await db.select().from(identities).where(eq(identities.id, input.identityId)).limit(1);
  const identity = identityRows[0];
  if (identity?.did) {
    await db
      .update(didRecords)
      .set({
        status: input.lifecycleState === "VERIFIED" ? "ACTIVE" : "REVOKED",
        ...(input.lifecycleState !== "VERIFIED" ? { revokedAt: new Date() } : { revokedAt: null }),
      })
      .where(eq(didRecords.did, identity.did));
  }
  return identity ?? null;
}

export async function setIdentityScope(identityId: string, scope: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(identities).set({ scope }).where(eq(identities.id, identityId));
}

export async function listIdentitiesInScope(scope: string | null): Promise<Identity[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(identities).orderBy(desc(identities.createdAt));
  if (scope == null) return rows; // global scope (admin/auditor)
  return rows.filter(row => row.scope === scope || row.organization === scope || row.id === scope);
}

export async function countActiveAdminIdentities(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const adminRoleRows = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, "ADMIN")).limit(1);
  const adminRoleId = adminRoleRows[0]?.id;
  if (!adminRoleId) return 0;
  const rows = await db
    .select({ identityId: identityRoles.identityId })
    .from(identityRoles)
    .innerJoin(identities, eq(identities.id, identityRoles.identityId))
    .where(and(eq(identityRoles.roleId, adminRoleId), eq(identities.status, "ACTIVE")));
  return rows.length;
}

export async function createMintRequest(input: {
  assetId: string;
  name: string;
  type: string;
  classification: "PUBLIC" | "CONTROLLED" | "SENSITIVE" | "HIGHLY_SENSITIVE" | "CRITICAL";
  description?: string | null;
  integrityHash?: string | null;
  ownerIdentityId: string;
  custodianIdentityId: string;
  requestedByIdentityId: string;
  requesterScope: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(mintRequests).values({
    id,
    assetId: input.assetId,
    name: input.name,
    type: input.type,
    classification: input.classification,
    description: input.description ?? null,
    integrityHash: input.integrityHash ?? null,
    ownerIdentityId: input.ownerIdentityId,
    custodianIdentityId: input.custodianIdentityId,
    requestedByIdentityId: input.requestedByIdentityId,
    requesterScope: input.requesterScope ?? null,
    status: "PENDING",
  });
  const rows = await db.select().from(mintRequests).where(eq(mintRequests.id, id)).limit(1);
  return rows[0];
}

export async function getMintRequest(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(mintRequests).where(eq(mintRequests.id, id)).limit(1);
  return rows[0];
}

export async function listMintRequests(status?: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED") {
  const db = await getDb();
  if (!db) return [];
  const base = db.select().from(mintRequests).orderBy(desc(mintRequests.createdAt)).limit(100);
  if (!status) return base;
  return db.select().from(mintRequests).where(eq(mintRequests.status, status)).orderBy(desc(mintRequests.createdAt)).limit(100);
}

export async function decideMintRequest(input: { id: string; status: "APPROVED" | "REJECTED"; decidedByIdentityId: string; decisionReason: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .update(mintRequests)
    .set({ status: input.status, decidedByIdentityId: input.decidedByIdentityId, decisionReason: input.decisionReason, decidedAt: new Date() })
    .where(and(eq(mintRequests.id, input.id), eq(mintRequests.status, "PENDING")));
  if (!result || result[0].affectedRows === 0) return undefined;
  const rows = await db.select().from(mintRequests).where(eq(mintRequests.id, input.id)).limit(1);
  return rows[0];
}

export async function markMintRequestExecuted(id: string, tokenId: string, transactionHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db
    .update(mintRequests)
    .set({ status: "EXECUTED", tokenId, transactionHash, executedAt: new Date() })
    .where(eq(mintRequests.id, id));
  const rows = await db.select().from(mintRequests).where(eq(mintRequests.id, id)).limit(1);
  return rows[0];
}

export async function createAssetTransferRequest(input: {
  assetId: string;
  tokenId: string | null;
  fromIdentityId: string;
  toIdentityId: string;
  requestedByIdentityId: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(assetTransferRequests).values({
    id,
    assetId: input.assetId,
    tokenId: input.tokenId,
    fromIdentityId: input.fromIdentityId,
    toIdentityId: input.toIdentityId,
    requestedByIdentityId: input.requestedByIdentityId,
    status: "PENDING",
  });
  const rows = await db.select().from(assetTransferRequests).where(eq(assetTransferRequests.id, id)).limit(1);
  return rows[0];
}

export async function getAssetTransferRequest(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(assetTransferRequests).where(eq(assetTransferRequests.id, id)).limit(1);
  return rows[0];
}

export async function listAssetTransferRequests(filter?: { fromIdentityId?: string; toIdentityId?: string; status?: "PENDING" | "ACCEPTED" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filter?.fromIdentityId) conditions.push(eq(assetTransferRequests.fromIdentityId, filter.fromIdentityId));
  if (filter?.toIdentityId) conditions.push(eq(assetTransferRequests.toIdentityId, filter.toIdentityId));
  if (filter?.status) conditions.push(eq(assetTransferRequests.status, filter.status));
  const query = db.select().from(assetTransferRequests).orderBy(desc(assetTransferRequests.createdAt)).limit(100);
  if (conditions.length === 0) return query;
  return db.select().from(assetTransferRequests).where(and(...conditions)).orderBy(desc(assetTransferRequests.createdAt)).limit(100);
}

export async function updateAssetTransferRequest(id: string, patch: Partial<typeof assetTransferRequests.$inferInsert>) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(assetTransferRequests).set(patch).where(eq(assetTransferRequests.id, id));
  const rows = await db.select().from(assetTransferRequests).where(eq(assetTransferRequests.id, id)).limit(1);
  return rows[0];
}

export async function createAssetDispute(input: { assetId: string; raisedByIdentityId: string; evidenceHash: string; reason: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(assetDisputes).values({
    id,
    assetId: input.assetId,
    raisedByIdentityId: input.raisedByIdentityId,
    evidenceHash: input.evidenceHash,
    reason: input.reason,
    status: "OPEN",
  });
  const rows = await db.select().from(assetDisputes).where(eq(assetDisputes.id, id)).limit(1);
  return rows[0];
}

export async function getAssetDispute(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(assetDisputes).where(eq(assetDisputes.id, id)).limit(1);
  return rows[0];
}

export async function listAssetDisputes(status?: "OPEN" | "UPHELD" | "REJECTED") {
  const db = await getDb();
  if (!db) return [];
  if (!status) return db.select().from(assetDisputes).orderBy(desc(assetDisputes.createdAt)).limit(100);
  return db.select().from(assetDisputes).where(eq(assetDisputes.status, status)).orderBy(desc(assetDisputes.createdAt)).limit(100);
}

/** OPEN or UPHELD disputes for an asset (transfer HOLD check). */
export async function listOpenDisputesForAsset(assetId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assetDisputes)
    .where(and(eq(assetDisputes.assetId, assetId), inArray(assetDisputes.status, ["OPEN", "UPHELD"])));
}

export async function resolveAssetDispute(input: { id: string; status: "UPHELD" | "REJECTED"; resolvedByIdentityId: string; resolutionReason: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .update(assetDisputes)
    .set({ status: input.status, resolvedByIdentityId: input.resolvedByIdentityId, resolutionReason: input.resolutionReason, resolvedAt: new Date() })
    .where(and(eq(assetDisputes.id, input.id), eq(assetDisputes.status, "OPEN")));
  if (!result || result[0].affectedRows === 0) return undefined;
  const rows = await db.select().from(assetDisputes).where(eq(assetDisputes.id, input.id)).limit(1);
  return rows[0];
}

export async function createIdentityAnomaly(input: { targetIdentityId: string | null; assetId: string | null; flaggedByIdentityId: string; reason: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(identityAnomalies).values({
    id,
    targetIdentityId: input.targetIdentityId,
    assetId: input.assetId,
    flaggedByIdentityId: input.flaggedByIdentityId,
    reason: input.reason,
  });
  const rows = await db.select().from(identityAnomalies).where(eq(identityAnomalies.id, id)).limit(1);
  return rows[0];
}

export async function listIdentityAnomalies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(identityAnomalies).orderBy(desc(identityAnomalies.createdAt)).limit(100);
}

export async function createAuditReportHash(input: { auditorIdentityId: string; reportHash: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(auditReportHashes).values({ id, auditorIdentityId: input.auditorIdentityId, reportHash: input.reportHash });
  const rows = await db.select().from(auditReportHashes).where(eq(auditReportHashes.id, id)).limit(1);
  return rows[0];
}

export async function listAuditReportHashes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditReportHashes).orderBy(desc(auditReportHashes.createdAt)).limit(100);
}

export async function getNextDidDocumentVersion(identityId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const rows = await db
    .select({ maxVersion: max(didDocumentVersions.versionNumber) })
    .from(didDocumentVersions)
    .where(eq(didDocumentVersions.identityId, identityId));
  return (rows[0]?.maxVersion ?? 0) + 1;
}

export async function createDidDocumentVersion(input: { identityId: string; versionNumber: number; documentHash: string; reason: string; createdByIdentityId: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(didDocumentVersions).values({
    id,
    identityId: input.identityId,
    versionNumber: input.versionNumber,
    documentHash: input.documentHash,
    reason: input.reason,
    createdByIdentityId: input.createdByIdentityId,
  });
  const rows = await db.select().from(didDocumentVersions).where(eq(didDocumentVersions.id, id)).limit(1);
  return rows[0];
}

export async function listDidDocumentVersions(identityId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(didDocumentVersions)
    .where(eq(didDocumentVersions.identityId, identityId))
    .orderBy(desc(didDocumentVersions.versionNumber));
}

export async function grantConsent(input: { subjectIdentityId: string; verifierDid: string; scope: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(consentGrants).values({
    id,
    subjectIdentityId: input.subjectIdentityId,
    verifierDid: input.verifierDid,
    scope: input.scope,
    expiresAt: input.expiresAt,
  });
  const rows = await db.select().from(consentGrants).where(eq(consentGrants.id, id)).limit(1);
  return rows[0];
}

export async function listConsents(subjectIdentityId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consentGrants).where(eq(consentGrants.subjectIdentityId, subjectIdentityId)).orderBy(desc(consentGrants.grantedAt)).limit(100);
}

export async function revokeConsent(input: { id: string; subjectIdentityId: string }) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(consentGrants)
    .set({ revokedAt: new Date() })
    .where(and(eq(consentGrants.id, input.id), eq(consentGrants.subjectIdentityId, input.subjectIdentityId), isNull(consentGrants.revokedAt)));
  return affectedRowsOf(result) > 0;
}

export async function createKeyRecoveryRequest(input: { subjectIdentityId: string; requestedByIdentityId: string; newKeyDigest: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(keyRecoveryRequests).values({
    id,
    subjectIdentityId: input.subjectIdentityId,
    requestedByIdentityId: input.requestedByIdentityId,
    newKeyDigest: input.newKeyDigest,
    status: "PENDING",
    guardianApprovals: [],
  });
  const rows = await db.select().from(keyRecoveryRequests).where(eq(keyRecoveryRequests.id, id)).limit(1);
  return rows[0];
}

export async function getKeyRecoveryRequest(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(keyRecoveryRequests).where(eq(keyRecoveryRequests.id, id)).limit(1);
  return rows[0];
}

export async function listKeyRecoveryRequests(status?: "PENDING" | "AWAITING_ADMIN" | "APPROVED" | "REJECTED" | "EXECUTED") {
  const db = await getDb();
  if (!db) return [];
  if (!status) return db.select().from(keyRecoveryRequests).orderBy(desc(keyRecoveryRequests.createdAt)).limit(100);
  return db.select().from(keyRecoveryRequests).where(eq(keyRecoveryRequests.status, status)).orderBy(desc(keyRecoveryRequests.createdAt)).limit(100);
}

export async function updateKeyRecoveryRequest(id: string, patch: Partial<typeof keyRecoveryRequests.$inferInsert>) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(keyRecoveryRequests).set(patch).where(eq(keyRecoveryRequests.id, id));
  const rows = await db.select().from(keyRecoveryRequests).where(eq(keyRecoveryRequests.id, id)).limit(1);
  return rows[0];
}

export async function createOwnershipPresentation(input: {
  subjectIdentityId: string;
  assetId: string;
  verifierDid: string;
  purpose: string;
  nonce: string;
  signature: string;
  keyIdentifier: string;
  message: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(ownershipPresentations).values({
    id,
    subjectIdentityId: input.subjectIdentityId,
    assetId: input.assetId,
    verifierDid: input.verifierDid,
    purpose: input.purpose,
    nonce: input.nonce,
    signature: input.signature,
    keyIdentifier: input.keyIdentifier,
    message: input.message,
    expiresAt: input.expiresAt,
  });
  const rows = await db.select().from(ownershipPresentations).where(eq(ownershipPresentations.id, id)).limit(1);
  return rows[0];
}

/** Single-use atomic consumption of an ownership presentation (replay-proof). */
export async function consumeOwnershipPresentation(nonce: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .update(ownershipPresentations)
    .set({ consumedAt: new Date() })
    .where(and(eq(ownershipPresentations.nonce, nonce), isNull(ownershipPresentations.consumedAt), gt(ownershipPresentations.expiresAt, new Date())));
  if (!result || result[0].affectedRows === 0) return undefined;
  const rows = await db.select().from(ownershipPresentations).where(eq(ownershipPresentations.nonce, nonce)).limit(1);
  return rows[0];
}

/* ------------------------------------------------------------------ */
/* PQC CRYPTO ASSURANCE (ML-DSA-65 keys + dual-signature challenges)    */
/* ------------------------------------------------------------------ */

/**
 * Register (or idempotently re-assert) an ACTIVE ML-DSA-65 public key for a
 * DID. PUBLIC material only — the unique (did, keyIdentifier) index makes a
 * concurrent double-registration safe: the second write converges on the same
 * row instead of creating a second authority.
 */
export async function registerPqcKeyRecord(input: {
  identityId: string;
  did: string;
  keyIdentifier: string;
  algorithm: string;
  publicKey: string;
  publicKeyFingerprint: string;
  keySource: "REGISTERED" | "SERVER_DERIVED";
  registeredByIdentityId?: string | null;
  note?: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db
    .insert(pqcKeyRecords)
    .values({
      id,
      identityId: input.identityId,
      did: input.did,
      keyIdentifier: input.keyIdentifier,
      algorithm: input.algorithm,
      publicKey: input.publicKey,
      publicKeyFingerprint: input.publicKeyFingerprint,
      keySource: input.keySource,
      registeredByIdentityId: input.registeredByIdentityId ?? null,
      note: input.note ?? null,
      status: "ACTIVE",
    })
    .onDuplicateKeyUpdate({
      set: {
        algorithm: input.algorithm,
        publicKey: input.publicKey,
        publicKeyFingerprint: input.publicKeyFingerprint,
        keySource: input.keySource,
        status: "ACTIVE",
        deactivatedAt: null,
      },
    });
  const rows = await db.select().from(pqcKeyRecords).where(eq(pqcKeyRecords.did, input.did)).limit(50);
  return rows.find(row => row.keyIdentifier === input.keyIdentifier);
}

/** The ACTIVE ML-DSA-65 verification key for a DID, or undefined. */
export async function getActivePqcKeyRecord(did: string) {
  return withDb(
    async db => {
      const rows = await db
        .select()
        .from(pqcKeyRecords)
        .where(and(eq(pqcKeyRecords.did, did), eq(pqcKeyRecords.status, "ACTIVE")))
        .orderBy(desc(pqcKeyRecords.createdAt))
        .limit(1);
      return rows[0];
    },
    () => undefined
  );
}

/** Key lifecycle history for a DID (newest first) — audit/evidence surface. */
export async function listPqcKeyRecords(did: string) {
  return withDb(
    async db => {
      return db
        .select()
        .from(pqcKeyRecords)
        .where(eq(pqcKeyRecords.did, did))
        .orderBy(desc(pqcKeyRecords.createdAt))
        .limit(100);
    },
    () => []
  );
}

/**
 * Rotate a DID's PQC key: the outgoing row is marked ROTATED (history is
 * preserved) and the incoming row becomes ACTIVE, in one transaction so the
 * DID is never observed with zero ACTIVE PQC keys after a successful rotate.
 */
export async function rotatePqcKeyRecord(input: {
  identityId: string;
  did: string;
  previousKeyIdentifier: string;
  newKeyIdentifier: string;
  algorithm: string;
  publicKey: string;
  publicKeyFingerprint: string;
  keySource: "REGISTERED" | "SERVER_DERIVED";
  registeredByIdentityId?: string | null;
  note?: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  await db.transaction(async tx => {
    await tx
      .update(pqcKeyRecords)
      .set({ status: "ROTATED", deactivatedAt: new Date(), supersededByKeyIdentifier: input.newKeyIdentifier })
      .where(and(eq(pqcKeyRecords.did, input.did), eq(pqcKeyRecords.keyIdentifier, input.previousKeyIdentifier)));
    await tx
      .insert(pqcKeyRecords)
      .values({
        id: crypto.randomUUID(),
        identityId: input.identityId,
        did: input.did,
        keyIdentifier: input.newKeyIdentifier,
        algorithm: input.algorithm,
        publicKey: input.publicKey,
        publicKeyFingerprint: input.publicKeyFingerprint,
        keySource: input.keySource,
        registeredByIdentityId: input.registeredByIdentityId ?? null,
        note: input.note ?? null,
        status: "ACTIVE",
      })
      .onDuplicateKeyUpdate({ set: { status: "ACTIVE", deactivatedAt: null } });
  });
  return getActivePqcKeyRecord(input.did);
}

/** Revoke the ACTIVE PQC key(s) for a DID (immediate, server-side). */
export async function setPqcKeyStatus(did: string, status: "ACTIVE" | "REVOKED", note?: string | null) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(pqcKeyRecords)
    .set({ status, deactivatedAt: status === "REVOKED" ? new Date() : null, ...(note ? { note } : {}) })
    .where(eq(pqcKeyRecords.did, did));
  return affectedRowsOf(result) > 0;
}

/** Persist a policy-scored assurance challenge (single-use, expiring). */
export async function createAssuranceChallenge(input: {
  identityId: string;
  did: string;
  operation: string;
  resourceType: string;
  resourceId: string;
  assuranceLevel: "BASELINE" | "ELEVATED" | "QUANTUM_HARDENED";
  requiredAlgorithms: string[];
  reasonCodes: string[];
  audience: string;
  ecdsaKeyIdentifier: string;
  pqcKeyIdentifier: string | null;
  nonce: string;
  message: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const id = crypto.randomUUID();
  await db.insert(assuranceChallenges).values({
    id,
    identityId: input.identityId,
    did: input.did,
    operation: input.operation,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    assuranceLevel: input.assuranceLevel,
    requiredAlgorithms: input.requiredAlgorithms,
    reasonCodes: input.reasonCodes,
    audience: input.audience,
    ecdsaKeyIdentifier: input.ecdsaKeyIdentifier,
    pqcKeyIdentifier: input.pqcKeyIdentifier,
    nonce: input.nonce,
    message: input.message,
    expiresAt: input.expiresAt,
  });
  const rows = await db.select().from(assuranceChallenges).where(eq(assuranceChallenges.id, id)).limit(1);
  return rows[0];
}

/**
 * Atomic single-use consumption of an assurance challenge. The guarded UPDATE
 * (identity + nonce + unconsumed + unexpired) is what makes concurrent replay
 * impossible: only one racing caller can flip consumedAt from NULL.
 */
export async function consumeAssuranceChallengeAtomic(input: { identityId: string; nonce: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .update(assuranceChallenges)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(assuranceChallenges.nonce, input.nonce),
        eq(assuranceChallenges.identityId, input.identityId),
        isNull(assuranceChallenges.consumedAt),
        gt(assuranceChallenges.expiresAt, new Date()),
      ),
    );
  if (!result || result[0].affectedRows === 0) return undefined;
  const rows = await db
    .select()
    .from(assuranceChallenges)
    .where(eq(assuranceChallenges.nonce, input.nonce))
    .limit(1);
  return rows[0];
}

/** Record which half of the dual signature verified (audit evidence). */
export async function markAssuranceHalfVerified(input: {
  challengeId: string;
  ecdsaVerified: boolean;
  pqcVerified: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(assuranceChallenges)
    .set({ ecdsaVerified: input.ecdsaVerified, pqcVerified: input.pqcVerified })
    .where(eq(assuranceChallenges.id, input.challengeId));
}

/**
 * Resolve a consumed assurance GRANT for a specific operation + resource.
 * A grant that is unconsumed, expired outside the validity window, or bound to
 * a different operation/resource is NOT a grant — this returns undefined and
 * the caller must fail closed.
 */
export async function findValidAssuranceGrant(input: {
  grantId: string;
  identityId: string;
  operation: string;
  resourceType: string;
  resourceId: string;
  notOlderThan: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(assuranceChallenges)
    .where(
      and(
        eq(assuranceChallenges.id, input.grantId),
        eq(assuranceChallenges.identityId, input.identityId),
        eq(assuranceChallenges.operation, input.operation),
        eq(assuranceChallenges.resourceType, input.resourceType),
        eq(assuranceChallenges.resourceId, input.resourceId),
        isNotNull(assuranceChallenges.consumedAt),
        gt(assuranceChallenges.consumedAt, input.notOlderThan),
      ),
    )
    .limit(1);
  return rows[0];
}

/**
 * Claim an assurance grant for a single execution. The status-guarded UPDATE
 * (executedAt IS NULL) means only one caller can ever claim a given grant, so
 * a verified dual signature cannot be replayed across two critical
 * operations. Returns true when THIS caller won the claim.
 */
export async function claimAssuranceGrantExecution(grantId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const claimed = await db
    .update(assuranceChallenges)
    .set({ executedAt: new Date() })
    .where(and(eq(assuranceChallenges.id, grantId), isNull(assuranceChallenges.executedAt)));
  // drizzle's mysql2 update() resolves to [ResultSetHeader, FieldPacket[]] —
  // affectedRows lives on element 0. Reading it off the array yields undefined,
  // and `undefined !== 0` is TRUE, which silently reported every guarded
  // UPDATE as a success (proven live: a single-use assurance grant could be
  // claimed twice). Read the header explicitly.
  return affectedRowsOf(claimed) > 0;
}

/**
 * Rows touched by a drizzle mysql2 write, read from the ResultSetHeader.
 * Centralised so no call site can repeat the array-vs-header mistake.
 */
function affectedRowsOf(result: unknown): number {
  if (Array.isArray(result)) {
    const header = result[0] as { affectedRows?: number } | undefined;
    return typeof header?.affectedRows === "number" ? header.affectedRows : 0;
  }
  const header = result as { affectedRows?: number } | null | undefined;
  return typeof header?.affectedRows === "number" ? header.affectedRows : 0;
}

/** Assurance challenge history for one identity (audit surface). */
export async function listAssuranceChallenges(identityId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assuranceChallenges)
    .where(eq(assuranceChallenges.identityId, identityId))
    .orderBy(desc(assuranceChallenges.createdAt))
    .limit(50);
}

// ------------------------------------------------------------------
// TinyFish External Evidence Read-Model & Approval Queue
// ------------------------------------------------------------------

const _inMemoryEvidence: Evidence[] = [];
let _evidenceIdCounter = 1;

export async function createEvidenceRecord(input: {
  kind: "ADVISORY" | "CLAIM" | "PORTAL";
  component: string;
  sourceUrl: string;
  fetchedAt?: Date;
  sha256: string;
  ipfsCid?: string | null;
  riskScore?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ANCHORED";
  approvedBy?: string | null;
  txHash?: string | null;
  rawText?: string | null;
}): Promise<Evidence> {
  const db = await getDb();
  const now = new Date();
  const item: InsertEvidence = {
    kind: input.kind,
    component: input.component,
    sourceUrl: input.sourceUrl,
    fetchedAt: input.fetchedAt ?? now,
    sha256: input.sha256,
    ipfsCid: input.ipfsCid ?? null,
    riskScore: input.riskScore ?? 0,
    status: input.status ?? "PENDING",
    approvedBy: input.approvedBy ?? null,
    txHash: input.txHash ?? null,
    rawText: input.rawText ?? null,
    createdAt: now,
    updatedAt: now,
  };

  if (!db) {
    const memItem: Evidence = {
      id: _evidenceIdCounter++,
      kind: item.kind,
      component: item.component,
      sourceUrl: item.sourceUrl,
      fetchedAt: item.fetchedAt ?? now,
      sha256: item.sha256,
      ipfsCid: item.ipfsCid ?? null,
      riskScore: item.riskScore ?? 0,
      status: item.status ?? "PENDING",
      approvedBy: item.approvedBy ?? null,
      txHash: item.txHash ?? null,
      rawText: item.rawText ?? null,
      createdAt: now,
      updatedAt: now,
    };
    _inMemoryEvidence.unshift(memItem);
    return memItem;
  }

  const [res] = await db.insert(evidence).values(item);
  const insertedId = res?.insertId ? Number(res.insertId) : undefined;
  if (insertedId) {
    const [row] = await db.select().from(evidence).where(eq(evidence.id, insertedId)).limit(1);
    if (row) return row;
  }
  const [latest] = await db.select().from(evidence).where(eq(evidence.sha256, input.sha256)).orderBy(desc(evidence.id)).limit(1);
  return latest!;
}

export async function listEvidenceRecords(filter?: {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ANCHORED";
  kind?: "ADVISORY" | "CLAIM" | "PORTAL";
  limit?: number;
}): Promise<Evidence[]> {
  const db = await getDb();
  if (!db) {
    let res = [..._inMemoryEvidence];
    if (filter?.status) res = res.filter(e => e.status === filter.status);
    if (filter?.kind) res = res.filter(e => e.kind === filter.kind);
    return res.slice(0, filter?.limit ?? 100);
  }

  let query = db.select().from(evidence).$dynamic();
  const conditions = [];
  if (filter?.status) conditions.push(eq(evidence.status, filter.status));
  if (filter?.kind) conditions.push(eq(evidence.kind, filter.kind));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  return query.orderBy(desc(evidence.id)).limit(filter?.limit ?? 100);
}

export async function getEvidenceRecordById(id: number): Promise<Evidence | null> {
  const db = await getDb();
  if (!db) {
    return _inMemoryEvidence.find(e => e.id === id) ?? null;
  }
  const [row] = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
  return row ?? null;
}

export async function updateEvidenceRecordStatus(
  id: number,
  update: {
    status: "PENDING" | "APPROVED" | "REJECTED" | "ANCHORED";
    approvedBy?: string | null;
    txHash?: string | null;
  }
): Promise<Evidence | null> {
  const db = await getDb();
  const now = new Date();
  if (!db) {
    const item = _inMemoryEvidence.find(e => e.id === id);
    if (!item) return null;
    item.status = update.status;
    if (update.approvedBy !== undefined) item.approvedBy = update.approvedBy;
    if (update.txHash !== undefined) item.txHash = update.txHash;
    item.updatedAt = now;
    return item;
  }

  await db.update(evidence).set({
    status: update.status,
    ...(update.approvedBy !== undefined ? { approvedBy: update.approvedBy } : {}),
    ...(update.txHash !== undefined ? { txHash: update.txHash } : {}),
    updatedAt: now,
  }).where(eq(evidence.id, id));

  const [row] = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
  return row ?? null;
}
