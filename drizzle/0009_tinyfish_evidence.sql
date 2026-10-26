CREATE TABLE `evidence` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`kind` enum('ADVISORY','CLAIM','PORTAL') NOT NULL,
	`component` varchar(255) NOT NULL,
	`source_url` text NOT NULL,
	`fetched_at` timestamp NOT NULL DEFAULT (now()),
	`sha256` varchar(64) NOT NULL,
	`ipfs_cid` varchar(255),
	`risk_score` int NOT NULL DEFAULT 0,
	`status` enum('PENDING','APPROVED','REJECTED','ANCHORED') NOT NULL DEFAULT 'PENDING',
	`approved_by` varchar(255),
	`tx_hash` varchar(255),
	`raw_text` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `evidence_status_idx` ON `evidence` (`status`);--> statement-breakpoint
CREATE INDEX `evidence_kind_idx` ON `evidence` (`kind`);--> statement-breakpoint
CREATE INDEX `evidence_sha_idx` ON `evidence` (`sha256`);
