import { MigrationInterface, QueryRunner } from "typeorm";

export class user1643820138542 implements MigrationInterface {
	name = "user1643820138542";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE \`user\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`twitter_id\` varchar(255) NOT NULL, \`address\` varchar(255) NULL, \`status\` enum ('ACTIVE', 'SUSPEND_OUT', 'SUSPEND_IN', 'LOCKED') NOT NULL DEFAULT 'ACTIVE', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_55008adb3b4101af12f495c9c1\` (\`twitter_id\`), UNIQUE INDEX \`IDX_3122b4b8709577da50e89b6898\` (\`address\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX \`IDX_3122b4b8709577da50e89b6898\` ON \`user\``
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_55008adb3b4101af12f495c9c1\` ON \`user\``
		);
		await queryRunner.query(`DROP TABLE \`user\``);
	}
}
