declare namespace NodeJS {
	interface ProcessEnv {
		readonly ENV: "development" | "production";
		readonly DB_HOST: string;
		readonly DB_PORT: string;
		readonly DB_USERNAME: string;
		readonly DB_PASSWORD: string;
		readonly DB_DATABASE: string;
	}
}
