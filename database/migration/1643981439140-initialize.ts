import { MigrationInterface, QueryRunner } from "typeorm";

export class initialize1643981439140 implements MigrationInterface {
	name = "initialize1643981439140";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`withdraw_request\` ADD \`tax\` int NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
		await queryRunner.query(
			`ALTER TABLE \`setting_flag\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`setting_flag\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(
			`ALTER TABLE \`withdraw_request\` DROP COLUMN \`tax\``
		);
	}
}
