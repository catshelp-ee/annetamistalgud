-- CreateTable
CREATE TABLE `total_donations_counter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalCount` INTEGER NOT NULL DEFAULT 0,
    `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Initialize with a single row
INSERT INTO `total_donations_counter` (`id`, `totalAmount`, `totalCount`, `lastUpdated`)
VALUES (1, 0, 0, NOW());