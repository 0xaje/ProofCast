ALTER TABLE `decision_receipts` ADD `commitmentHash` varchar(66);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `modelProbabilityBps` int;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `modelConfidence` varchar(32);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `marketQuality` varchar(32);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `executablePriceBps` int;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `executableEdgeBps` int;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `anchorTxHash` varchar(128);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `anchorAddress` varchar(64);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `anchorTimestamp` timestamp;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `tradeTxHash` varchar(128);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `tradeOrderId` varchar(64);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `tradeStatus` varchar(32) DEFAULT 'NONE';--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `signerAddress` varchar(64);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `eip712Signature` text;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `stakeAmountWei` varchar(64);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `stakeTxHash` varchar(128);--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `stakeStatus` enum('NONE','STAKED','WON','LOST','REFUNDED') DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE `receipt_resolutions` ADD `oracleSource` varchar(64) DEFAULT 'DREAMDEX_ONCHAIN' NOT NULL;--> statement-breakpoint
CREATE INDEX `decision_receipts_anchor_tx_idx` ON `decision_receipts` (`anchorTxHash`);