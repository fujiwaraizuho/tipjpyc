import { ConnectionOptions } from "typeorm";

const ormconfig: ConnectionOptions = {
	type: "mysql",
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT, 3306),
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	synchronize: false,
	logging: false,
	entities: ["database/entity/**/*.ts"],
	migrations: ["database/migration/**/*.ts"],
	subscribers: ["database/subscriber/**/*.ts"],
	cli: {
		entitiesDir: "database/entity",
		migrationsDir: "database/migration",
		subscribersDir: "database/subscriber",
	},
};

export default ormconfig;
