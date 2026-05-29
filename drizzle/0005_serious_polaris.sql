CREATE TABLE `email_sequence_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tier` varchar(32) NOT NULL,
	`emailNumber` int NOT NULL,
	`subject` varchar(255),
	`sentCount` int,
	`openRate` decimal(5,2),
	`clickRate` decimal(5,2),
	`unsubCount` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_sequence_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manual_sales_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tier` varchar(32) NOT NULL,
	`periodLabel` varchar(64),
	`salesCount` int NOT NULL DEFAULT 0,
	`revenue` decimal(10,2),
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manual_sales_summary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `funnel_events` ADD `lastQuestionReached` int;