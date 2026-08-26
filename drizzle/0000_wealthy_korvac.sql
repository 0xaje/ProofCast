CREATE TABLE `decision_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`forecastId` int NOT NULL,
	`marketSnapshotId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decision_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `decision_receipts_forecast_unique` UNIQUE(`forecastId`)
);
--> statement-breakpoint
CREATE TABLE `forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`marketId` varchar(128) NOT NULL,
	`direction` enum('UP','DOWN') NOT NULL,
	`probabilityBps` int NOT NULL,
	`confidence` enum('LOW','MEDIUM','HIGH') NOT NULL,
	`thesis` text NOT NULL,
	`counterThesis` text NOT NULL,
	`status` enum('COMMITTED','REVISED') NOT NULL DEFAULT 'COMMITTED',
	`committedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forecasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`marketId` varchar(128) NOT NULL,
	`marketAddress` varchar(64) NOT NULL,
	`poolAddress` varchar(64) NOT NULL,
	`asset` varchar(32) NOT NULL,
	`question` text NOT NULL,
	`indexedStatus` varchar(32) NOT NULL,
	`marketState` enum('TRADING','PREOPEN','LOCKED') NOT NULL,
	`network` varchar(64) NOT NULL,
	`chainId` int NOT NULL,
	`sourceAsOf` bigint NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`tradingStart` bigint NOT NULL,
	`expiry` bigint NOT NULL,
	`secondsToExpiry` int NOT NULL,
	`lastPriceBps` int,
	`bestBidBps` int,
	`bestAskBps` int,
	`midBps` int,
	`spreadBps` int,
	`provenanceJson` text NOT NULL,
	`orderBookJson` text NOT NULL,
	CONSTRAINT `market_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD CONSTRAINT `decision_receipts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD CONSTRAINT `decision_receipts_forecastId_forecasts_id_fk` FOREIGN KEY (`forecastId`) REFERENCES `forecasts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decision_receipts` ADD CONSTRAINT `decision_receipts_marketSnapshotId_market_snapshots_id_fk` FOREIGN KEY (`marketSnapshotId`) REFERENCES `market_snapshots`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forecasts` ADD CONSTRAINT `forecasts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `decision_receipts_user_created_idx` ON `decision_receipts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `forecasts_user_created_idx` ON `forecasts` (`userId`,`committedAt`);--> statement-breakpoint
CREATE INDEX `forecasts_market_created_idx` ON `forecasts` (`marketId`,`committedAt`);--> statement-breakpoint
CREATE INDEX `market_snapshots_market_captured_idx` ON `market_snapshots` (`marketId`,`capturedAt`);--> statement-breakpoint
CREATE INDEX `market_snapshots_source_as_of_idx` ON `market_snapshots` (`sourceAsOf`);