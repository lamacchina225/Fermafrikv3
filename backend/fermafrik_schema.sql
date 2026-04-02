CREATE TABLE `buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`capacity` int NOT NULL,
	`status` enum('active','inactive','construction') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buildings_id` PRIMARY KEY(`id`)
);

CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`city` varchar(100),
	`phone` varchar(20),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);

CREATE TABLE `cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`building_id` int NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date,
	`phase` enum('demarrage','croissance','production') NOT NULL DEFAULT 'demarrage',
	`initial_count` int NOT NULL,
	`notes` text,
	CONSTRAINT `cycles_id` PRIMARY KEY(`id`)
);

CREATE TABLE `daily_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` int NOT NULL,
	`building_id` int NOT NULL,
	`record_date` date NOT NULL,
	`eggs_collected` int NOT NULL DEFAULT 0,
	`eggs_broken` int NOT NULL DEFAULT 0,
	`eggs_sold` int NOT NULL DEFAULT 0,
	`sale_price_per_tray` decimal(10,2),
	`revenue` decimal(12,2) DEFAULT '0',
	`mortality_count` int NOT NULL DEFAULT 0,
	`mortality_cause` text,
	`feed_quantity_kg` decimal(8,2) DEFAULT '0',
	`feedType` enum('demarrage','croissance','ponte'),
	`feed_cost` decimal(10,2) DEFAULT '0',
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_records_id` PRIMARY KEY(`id`)
);

CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` int NOT NULL,
	`building_id` int NOT NULL,
	`expense_date` date NOT NULL,
	`label` varchar(200) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` enum('alimentation','sante','energie','main_oeuvre','equipement','autre') NOT NULL DEFAULT 'autre',
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);

CREATE TABLE `feed_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`building_id` int NOT NULL,
	`movement_date` date NOT NULL,
	`movementType` enum('in','out') NOT NULL,
	`quantity_kg` decimal(8,2) NOT NULL,
	`unit_cost` decimal(10,2),
	`total_cost` decimal(12,2),
	`feedType` enum('demarrage','croissance','ponte') NOT NULL,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feed_stock_id` PRIMARY KEY(`id`)
);

CREATE TABLE `health_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` int NOT NULL,
	`building_id` int NOT NULL,
	`record_date` date NOT NULL,
	`type` enum('vaccination','medication') NOT NULL,
	`product_name` varchar(200) NOT NULL,
	`dose` varchar(100),
	`cost` decimal(10,2) DEFAULT '0',
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `health_records_id` PRIMARY KEY(`id`)
);

CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycle_id` int NOT NULL,
	`building_id` int NOT NULL,
	`sale_date` date NOT NULL,
	`trays_sold` int NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`total_amount` decimal(12,2) NOT NULL,
	`client_id` int,
	`buyer_name` varchar(200),
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);

CREATE TABLE `settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_by` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);

CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password_hash` text NOT NULL,
	`role` enum('admin','gestionnaire','demo') NOT NULL DEFAULT 'gestionnaire',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);

ALTER TABLE `cycles` ADD CONSTRAINT `cycles_building_id_buildings_id_fk` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `daily_records` ADD CONSTRAINT `daily_records_cycle_id_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `daily_records` ADD CONSTRAINT `daily_records_building_id_buildings_id_fk` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `daily_records` ADD CONSTRAINT `daily_records_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_cycle_id_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_building_id_buildings_id_fk` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `feed_stock` ADD CONSTRAINT `feed_stock_building_id_buildings_id_fk` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `feed_stock` ADD CONSTRAINT `feed_stock_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `health_records` ADD CONSTRAINT `health_records_cycle_id_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `health_records` ADD CONSTRAINT `health_records_building_id_buildings_id_fk` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `health_records` ADD CONSTRAINT `health_records_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `sales` ADD CONSTRAINT `sales_cycle_id_cycles_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `sales` ADD CONSTRAINT `sales_building_id_buildings_id_fk` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `sales` ADD CONSTRAINT `sales_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `sales` ADD CONSTRAINT `sales_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `settings` ADD CONSTRAINT `settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
CREATE INDEX `cycles_building_id_idx` ON `cycles` (`building_id`);
CREATE INDEX `daily_records_cycle_id_idx` ON `daily_records` (`cycle_id`);
CREATE INDEX `daily_records_building_id_idx` ON `daily_records` (`building_id`);
CREATE INDEX `daily_records_record_date_idx` ON `daily_records` (`record_date`);
CREATE INDEX `expenses_cycle_id_idx` ON `expenses` (`cycle_id`);
CREATE INDEX `expenses_expense_date_idx` ON `expenses` (`expense_date`);
CREATE INDEX `health_records_cycle_id_idx` ON `health_records` (`cycle_id`);
CREATE INDEX `sales_cycle_id_idx` ON `sales` (`cycle_id`);
CREATE INDEX `sales_sale_date_idx` ON `sales` (`sale_date`);