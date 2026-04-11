CREATE TABLE `funnel_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`eventType` enum('page_view','quiz_start','quiz_complete','vsl_view','vsl_25','vsl_50','vsl_75','vsl_100','order_click','order_placed') NOT NULL,
	`eventTimestamp` timestamp NOT NULL DEFAULT (now()),
	`submissionId` int,
	`email` varchar(320),
	`alertTier` varchar(32),
	`scoreBand` varchar(32),
	`vslVersion` varchar(4),
	`adName` varchar(255),
	`referrerPlatform` varchar(64),
	`utmSource` varchar(255),
	`utmCampaign` varchar(255),
	`orderValue` decimal(10,2),
	CONSTRAINT `funnel_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int,
	`email` varchar(320) NOT NULL,
	`fullName` varchar(255),
	`productName` varchar(255) NOT NULL,
	`orderValue` decimal(10,2) NOT NULL,
	`orderDate` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `sessionId` varchar(128);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `submissionDate` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `awesomecrmContactId` varchar(128);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `tagApplied` varchar(64);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `tagAppliedAt` timestamp;--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `isRepeatSubmission` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `timezone` varchar(64);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `alertTier` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `scoreBand` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `highestScoreCategory` varchar(64);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `lowestScoreCategory` varchar(64);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q1Digestion` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q2Heartburn` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q3WeightChanges` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q4Energy` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q5AfterMeals` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q6EatingControl` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q7LoseWeight` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q8Breakfast` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q9Sleep` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q10BrainFog` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q11MoodSwings` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q12Diet` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q13FermentedFoods` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q14PrebioticFoods` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q15Antacids` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q16PainPills` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `q17Antibiotics` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `adName` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `adNameRaw` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `referrerUrl` text;--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `referrerPlatform` varchar(64);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `utmSource` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `utmMedium` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `utmCampaign` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `utmId` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `utmTerm` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `fbclid` varchar(512);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `fbEventId` varchar(255);--> statement-breakpoint
ALTER TABLE `quiz_submissions` ADD `pageUrl` text;