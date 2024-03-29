import { MigrationInterface, QueryRunner } from "typeorm";

export class initialize1644515910395 implements MigrationInterface {
	name = "initialize1644515910395";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`withdraw_request\` CHANGE \`txid\` \`txid\` varchar(255) NULL`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
		await queryRunner.query(
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
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
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(
			`ALTER TABLE \`transaction\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(
			`ALTER TABLE \`withdraw_request\` CHANGE \`txid\` \`txid\` varchar(255) NOT NULL`
		);
	}
}
