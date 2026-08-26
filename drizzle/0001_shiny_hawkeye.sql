CREATE TABLE `forecast_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptId` int NOT NULL,
	`userId` int NOT NULL,
	`parentForecastId` int NOT NULL,
	`revisionNumber` int NOT NULL,
	`direction` enum('UP','DOWN') NOT NULL,
	`probabilityBps` int NOT NULL,
	`confidence` enum('LOW','MEDIUM','HIGH') NOT NULL,
	`thesis` text NOT NULL,
	`counterThesis` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forecast_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `forecast_revisions_receipt_revision_unique` UNIQUE(`receiptId`,`revisionNumber`)
);
--> statement-breakpoint
CREATE TABLE `receipt_resolutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptId` int NOT NULL,
	`userId` int NOT NULL,
	`outcome` enum('YES','NO','VOID') NOT NULL,
	`verificationStatus` enum('SUBMITTED','VERIFIED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
	`sourceUrl` varchar(2048) NOT NULL,
	`evidenceSummary` text NOT NULL,
	`verifiedBy` varchar(128),
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipt_resolutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forecast_revisions` ADD CONSTRAINT `forecast_revisions_receiptId_decision_receipts_id_fk` FOREIGN KEY (`receiptId`) REFERENCES `decision_receipts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_revisions` ADD CONSTRAINT `forecast_revisions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecast_revisions` ADD CONSTRAINT `forecast_revisions_parentForecastId_forecasts_id_fk` FOREIGN KEY (`parentForecastId`) REFERENCES `forecasts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipt_resolutions` ADD CONSTRAINT `receipt_resolutions_receiptId_decision_receipts_id_fk` FOREIGN KEY (`receiptId`) REFERENCES `decision_receipts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipt_resolutions` ADD CONSTRAINT `receipt_resolutions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `forecast_revisions_user_created_idx` ON `forecast_revisions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `receipt_resolutions_receipt_created_idx` ON `receipt_resolutions` (`receiptId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `receipt_resolutions_user_created_idx` ON `receipt_resolutions` (`userId`,`createdAt`);