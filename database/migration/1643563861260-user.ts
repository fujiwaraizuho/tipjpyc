import { MigrationInterface, QueryRunner } from "typeorm";

export class user1643563861260 implements MigrationInterface {
	name = "user1643563861260";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE \`user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`twitter_id\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE \`user\``);
	}
}
