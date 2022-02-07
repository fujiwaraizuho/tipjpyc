import { MigrationInterface, QueryRunner } from "typeorm";

export class initialize1644246333435 implements MigrationInterface {
	name = "initialize1644246333435";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE \`user\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`twitter_id\` varchar(255) NOT NULL, \`address\` varchar(255) NULL, \`status\` enum ('ACTIVE', 'SUSPEND_OUT', 'SUSPEND_IN', 'LOCKED') NOT NULL DEFAULT 'ACTIVE', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_55008adb3b4101af12f495c9c1\` (\`twitter_id\`), UNIQUE INDEX \`IDX_3122b4b8709577da50e89b6898\` (\`address\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
		await queryRunner.query(
			`CREATE TABLE \`withdraw_request\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`transaction_id\` bigint NOT NULL, \`txid\` varchar(255) NOT NULL, \`address\` varchar(255) NOT NULL, \`amount\` int NOT NULL, \`tax\` int NOT NULL, \`network_type\` enum ('RINKEBY', 'POLYGON', 'MUMBAI') NOT NULL, \`status\` enum ('UNBUSY', 'BUSY', 'APPROVAL', 'DISAPPROVAL', 'FAILED') NOT NULL DEFAULT 'UNBUSY', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_6a912ff4b352c850fdddc5bd6f\` (\`address\`), UNIQUE INDEX \`IDX_e0b2512a1abd962faa42bf87d2\` (\`txid\`), UNIQUE INDEX \`REL_c78552d489e95366a9b5547ed2\` (\`transaction_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
		await queryRunner.query(
			`CREATE TABLE \`transaction\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`tx_user_id\` bigint NULL, \`tweet_id\` varchar(255) NULL, \`amount\` int NOT NULL, \`command_type\` enum ('DEPOSIT', 'WITHDRAW', 'TIP', 'BALANCE', 'OTHER') NOT NULL, \`description\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_b4a3d92d5dde30f3ab5c34c586\` (\`user_id\`), INDEX \`IDX_7099eb5e2adbf41cbf32c6e2c1\` (\`tx_user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
		await queryRunner.query(
			`CREATE TABLE \`deposit_history\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`transaction_id\` bigint NOT NULL, \`txid\` varchar(255) NOT NULL, \`amount\` int NOT NULL, \`network_type\` enum ('RINKEBY', 'POLYGON', 'MUMBAI') NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_77c9b37da975ba2317c5421405\` (\`txid\`), UNIQUE INDEX \`REL_da7b78bb01478d0893a5efe7bb\` (\`transaction_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
		await queryRunner.query(
			`CREATE TABLE \`setting_flag\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`deposit\` tinyint NOT NULL DEFAULT 1, \`withdrawRequest\` tinyint NOT NULL DEFAULT 1, \`tip\` tinyint NOT NULL DEFAULT 1, \`balance\` tinyint NOT NULL DEFAULT 1, \`depositListener\` tinyint NOT NULL DEFAULT 1, \`reason\` text NOT NULL, \`execAdmin\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
		await queryRunner.query(
			`ALTER TABLE \`withdraw_request\` ADD CONSTRAINT \`FK_c78552d489e95366a9b5547ed2e\` FOREIGN KEY (\`transaction_id\`) REFERENCES \`transaction\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` ADD CONSTRAINT \`FK_b4a3d92d5dde30f3ab5c34c5862\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` ADD CONSTRAINT \`FK_7099eb5e2adbf41cbf32c6e2c13\` FOREIGN KEY (\`tx_user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE \`deposit_history\` ADD CONSTRAINT \`FK_da7b78bb01478d0893a5efe7bbb\` FOREIGN KEY (\`transaction_id\`) REFERENCES \`transaction\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`deposit_history\` DROP FOREIGN KEY \`FK_da7b78bb01478d0893a5efe7bbb\``
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` DROP FOREIGN KEY \`FK_7099eb5e2adbf41cbf32c6e2c13\``
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` DROP FOREIGN KEY \`FK_b4a3d92d5dde30f3ab5c34c5862\``
		);
		await queryRunner.query(
			`ALTER TABLE \`withdraw_request\` DROP FOREIGN KEY \`FK_c78552d489e95366a9b5547ed2e\``
		);
		await queryRunner.query(`DROP TABLE \`setting_flag\``);
		await queryRunner.query(
			`DROP INDEX \`REL_da7b78bb01478d0893a5efe7bb\` ON \`deposit_history\``
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_77c9b37da975ba2317c5421405\` ON \`deposit_history\``
		);
		await queryRunner.query(`DROP TABLE \`deposit_history\``);
		await queryRunner.query(
			`DROP INDEX \`IDX_7099eb5e2adbf41cbf32c6e2c1\` ON \`transaction\``
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_b4a3d92d5dde30f3ab5c34c586\` ON \`transaction\``
		);
		await queryRunner.query(`DROP TABLE \`transaction\``);
		await queryRunner.query(
			`DROP INDEX \`REL_c78552d489e95366a9b5547ed2\` ON \`withdraw_request\``
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_e0b2512a1abd962faa42bf87d2\` ON \`withdraw_request\``
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_6a912ff4b352c850fdddc5bd6f\` ON \`withdraw_request\``
		);
		await queryRunner.query(`DROP TABLE \`withdraw_request\``);
		await queryRunner.query(
			`DROP INDEX \`IDX_3122b4b8709577da50e89b6898\` ON \`user\``
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_55008adb3b4101af12f495c9c1\` ON \`user\``
		);
		await queryRunner.query(`DROP TABLE \`user\``);
	}
}
