ALTER TABLE `decision_receipts` ADD `modelProbabilityBps` int NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `modelConfidence` varchar(32) NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `marketQuality` varchar(32) NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `executablePriceBps` int NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `executableEdgeBps` int NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `anchorTxHash` varchar(128) NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `anchorAddress` varchar(64) NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `anchorTimestamp` timestamp NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `tradeTxHash` varchar(128) NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `tradeOrderId` varchar(64) NULL;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD `tradeStatus` varchar(32) DEFAULT 'NONE' NULL;--> statement-breakpoint
CREATE INDEX `decision_receipts_anchor_tx_idx` ON `decision_receipts` (`anchorTxHash`);
