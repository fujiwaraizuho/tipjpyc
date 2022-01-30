declare namespace NodeJS {
	interface ProcessEnv {
		readonly ENV: "development" | "production";
		readonly DB_HOST: string;
		readonly DB_PORT: string;
		readonly DB_USERNAME: string;
		readonly DB_PASSWORD: string;
		readonly DB_DATABASE: string;
		readonly DISCORD_WEBHOOK_URL: string;
		readonly DISCORD_LOG_PREFIX: string;
	}
}
