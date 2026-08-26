ALTER TABLE `receipt_resolutions` ADD `evidenceHash` varchar(128) NULL;--> statement-breakpoint
ALTER TABLE `receipt_resolutions` ADD `hashAlgorithm` varchar(32) DEFAULT 'SHA-256' NOT NULL;--> statement-breakpoint
ALTER TABLE `receipt_resolutions` ADD `reviewerNotes` text;--> statement-breakpoint
UPDATE `receipt_resolutions` SET `evidenceHash` = SHA2(CONCAT_WS('|', `sourceUrl`, `outcome`, `evidenceSummary`), 256) WHERE `evidenceHash` IS NULL;--> statement-breakpoint
ALTER TABLE `receipt_resolutions` MODIFY `evidenceHash` varchar(128) NOT NULL;
