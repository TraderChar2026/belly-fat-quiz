CREATE TABLE `quiz_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(64),
	`answers` text NOT NULL,
	`totalScore` int NOT NULL,
	`digestiveScore` int NOT NULL,
	`appetiteScore` int NOT NULL,
	`gutScore` int NOT NULL,
	`crmTag` varchar(64),
	`ghlContactId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_submissions_id` PRIMARY KEY(`id`)
);
