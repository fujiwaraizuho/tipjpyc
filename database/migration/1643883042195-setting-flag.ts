import { MigrationInterface, QueryRunner } from "typeorm";

export class settingFlag1643883042195 implements MigrationInterface {
	name = "settingFlag1643883042195";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE \`setting_flag\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`deposit\` tinyint NOT NULL DEFAULT 1, \`withdrawRequest\` tinyint NOT NULL DEFAULT 1, \`tip\` tinyint NOT NULL DEFAULT 1, \`balance\` tinyint NOT NULL DEFAULT 1, \`depositListener\` tinyint NOT NULL DEFAULT 1, \`reason\` text NOT NULL, \`execAdmin\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
		await queryRunner.query(
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`user\` CHANGE \`updated_at\` \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP`
		);
		await queryRunner.query(`DROP TABLE \`setting_flag\``);
	}
}
