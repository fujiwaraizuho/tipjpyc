import { MigrationInterface, QueryRunner } from "typeorm";

export class initialize1643904153604 implements MigrationInterface {
	name = "initialize1643904153604";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` ADD UNIQUE INDEX \`IDX_de2a8cc3bb0ddd66809c016caa\` (\`tweet_id\`)`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
		await queryRunner.query(
			`ALTER TABLE \`deposit_history\` ADD UNIQUE INDEX \`IDX_77c9b37da975ba2317c5421405\` (\`txid\`)`
		);
		await queryRunner.query(
			`ALTER TABLE \`setting_flag\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
		await queryRunner.query(
			`CREATE INDEX \`IDX_6a912ff4b352c850fdddc5bd6f\` ON \`withdraw_request\` (\`address\`)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX \`IDX_6a912ff4b352c850fdddc5bd6f\` ON \`withdraw_request\``
		);
		await queryRunner.query(
			`ALTER TABLE \`setting_flag\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(
			`ALTER TABLE \`deposit_history\` DROP INDEX \`IDX_77c9b37da975ba2317c5421405\``
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` DROP INDEX \`IDX_de2a8cc3bb0ddd66809c016caa\``
		);
		await queryRunner.query(
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
	}
}
